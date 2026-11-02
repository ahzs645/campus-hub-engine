/**
 * Campus Hub Signaling Client
 *
 * Lightweight client for connecting displays and controllers
 * to the signaling server via Socket.IO.
 *
 * Usage (display):
 *   const client = createSignalingClient("ws://server:3030", "display", "lobby-tv-1");
 *   client.on("apply-config", ({ config }) => { ... });
 *   client.on("apply-action", ({ action }) => { ... });
 *   client.connect();
 *
 * Usage (controller):
 *   const client = createSignalingClient("ws://server:3030", "controller", "lobby-tv-1");
 *   client.on("display-online", (info) => { ... });
 *   client.pushConfig({ type: "url", value: "https://..." });
 *   client.connect();
 */

type Role = "display" | "controller";

interface SignalingConfig {
  type: "url" | "json" | "configUrl" | "playlistUrl";
  value: string;
}

type EventCallback = (data: Record<string, unknown>) => void;

interface SignalingClient {
  connect: () => void;
  disconnect: () => void;
  on: (event: string, callback: EventCallback) => void;
  off: (event: string, callback: EventCallback) => void;
  pushConfig: (config: SignalingConfig) => void;
  pushAction: (action: string) => void;
  sendHeartbeat: (currentConfig?: string) => void;
  reportStatus: (status: Record<string, unknown>) => void;
  isConnected: () => boolean;
  // Home Assistant bridge
  haSubscribe: (entityIds: string[]) => void;
  haUnsubscribe: (entityIds?: string[]) => void;
  haCallService: (domain: string, service: string, data?: Record<string, unknown>, target?: Record<string, unknown>) => void;
  haGetEntities: (domain?: string) => void;
}

function createSignalingClient(
  serverUrl: string,
  role: Role,
  displayId: string,
  options: { name?: string; currentConfig?: string; autoReconnect?: boolean; authToken?: string } = {}
): SignalingClient {
  const { name, currentConfig, autoReconnect = true, authToken } = options;

  const listeners = new Map<string, Set<EventCallback>>();
  let socket: ReturnType<typeof import("socket.io-client").io> | null = null;
  let connected = false;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  // Bumped by every connect()/disconnect() so a connect() whose async
  // socket.io-client import resolves after a disconnect() (or a newer
  // connect()) knows it has been superseded and must not open a socket.
  let generation = 0;
  let connecting = false;

  function stopHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  function emit(event: string, data: Record<string, unknown>) {
    const cbs = listeners.get(event);
    if (cbs) cbs.forEach((cb) => cb(data));
  }

  function on(event: string, callback: EventCallback) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event)!.add(callback);
  }

  function off(event: string, callback: EventCallback) {
    listeners.get(event)?.delete(callback);
  }

  async function connect() {
    // Idempotent: a second call while connecting or connected is a no-op.
    if (socket || connecting) return;
    connecting = true;
    const myGeneration = ++generation;

    let io: typeof import("socket.io-client").io;
    try {
      // Dynamic import — socket.io-client is only loaded when signaling is used
      ({ io } = await import("socket.io-client"));
    } catch (error) {
      if (myGeneration === generation) connecting = false;
      emit("error", { message: "Failed to load the signaling client", error: String(error) });
      return;
    }
    // disconnect() (or another connect cycle) ran while we were loading.
    if (myGeneration !== generation) return;
    connecting = false;

    const activeSocket = io(serverUrl, {
      reconnection: autoReconnect,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      transports: ["websocket", "polling"],
      ...(authToken ? { auth: { token: authToken } } : {}),
    });
    socket = activeSocket;

    activeSocket.on("connect", () => {
      connected = true;
      emit("connected", {});

      if (role === "display") {
        activeSocket.emit("register-display", { displayId, name, currentConfig });
        // Heartbeat every 30s; reset on reconnect so intervals never stack.
        stopHeartbeat();
        heartbeatInterval = setInterval(() => {
          activeSocket.emit("display-heartbeat", { displayId });
        }, 30000);
      } else {
        activeSocket.emit("join-display", { displayId });
      }
    });

    activeSocket.on("disconnect", () => {
      connected = false;
      stopHeartbeat();
      emit("disconnected", {});
    });

    // Handshake rejections (e.g. a missing or wrong auth token) arrive here.
    activeSocket.on("connect_error", (error: Error) => {
      emit("error", { message: error.message });
    });

    // Forward server events to listeners
    const forwardEvents = [
      "registered",
      "apply-config",
      "apply-action",
      "message",
      "display-online",
      "display-offline",
      "display-status",
      "error",
      // Home Assistant bridge events
      "ha-state",
      "ha-entities",
      "ha-error",
      "ha-service-result",
    ];

    for (const event of forwardEvents) {
      activeSocket.on(event, (data: Record<string, unknown>) => emit(event, data));
    }
  }

  function disconnect() {
    generation++;
    connecting = false;
    stopHeartbeat();
    const activeSocket = socket;
    socket = null;
    connected = false;
    if (activeSocket) {
      activeSocket.removeAllListeners();
      activeSocket.disconnect();
    }
    listeners.clear();
  }

  function pushConfig(config: SignalingConfig) {
    socket?.emit("push-config", { displayId, config });
  }

  function pushAction(action: string) {
    socket?.emit("push-action", { displayId, action });
  }

  function sendHeartbeat(config?: string) {
    socket?.emit("display-heartbeat", { displayId, currentConfig: config });
  }

  function reportStatus(status: Record<string, unknown>) {
    socket?.emit("display-status", { displayId, status });
  }

  // Home Assistant bridge methods
  function haSubscribe(entityIds: string[]) {
    socket?.emit("ha-subscribe", { entityIds });
  }

  function haUnsubscribe(entityIds?: string[]) {
    socket?.emit("ha-unsubscribe", { entityIds });
  }

  function haCallService(domain: string, service: string, data?: Record<string, unknown>, target?: Record<string, unknown>) {
    socket?.emit("ha-call-service", { domain, service, data, target });
  }

  function haGetEntities(domain?: string) {
    socket?.emit("ha-get-entities", { domain });
  }

  return {
    connect,
    disconnect,
    on,
    off,
    pushConfig,
    pushAction,
    sendHeartbeat,
    reportStatus,
    isConnected: () => connected,
    haSubscribe,
    haUnsubscribe,
    haCallService,
    haGetEntities,
  };
}

export { createSignalingClient };
export type { SignalingClient, SignalingConfig, Role };
