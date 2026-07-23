'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  evaluateVisibilityCondition,
  type VisibilitySignal,
} from '@firstform/campus-hub-widget-sdk';
import type { WidgetConfig } from './config';

interface PulseTracking {
  matched: boolean;
  revision?: string;
}

function mapCurrentSignals(
  signals: readonly VisibilitySignal[],
  now: number,
): Map<string, VisibilitySignal> {
  const current = new Map<string, VisibilitySignal>();
  for (const signal of signals) {
    if (signal.expiresAt !== undefined && signal.expiresAt <= now) continue;
    current.set(signal.key, signal);
  }
  return current;
}

function initialVisibility(
  widgets: readonly WidgetConfig[],
  signals: readonly VisibilitySignal[] | undefined,
): Map<string, boolean> {
  if (signals === undefined) {
    return new Map(widgets.map((widget) => [widget.id, true]));
  }

  const currentSignals = mapCurrentSignals(signals, Date.now());
  return new Map(
    widgets.map((widget) => [
      widget.id,
      widget.visibilityCondition
        ? evaluateVisibilityCondition(widget.visibilityCondition, currentSignals)
        : true,
    ]),
  );
}

export function useWidgetVisibility(
  widgets: readonly WidgetConfig[],
  signals: readonly VisibilitySignal[] | undefined,
): ReadonlyMap<string, boolean> {
  const [expirationRevision, setExpirationRevision] = useState(0);
  const [visibility, setVisibility] = useState(() =>
    initialVisibility(widgets, signals),
  );
  const pulseTrackingRef = useRef(new Map<string, PulseTracking>());
  const pulseTimersRef = useRef(
    new Map<string, ReturnType<typeof setTimeout>>(),
  );

  const clearPulseTimer = (widgetId: string) => {
    const timer = pulseTimersRef.current.get(widgetId);
    if (timer !== undefined) {
      clearTimeout(timer);
      pulseTimersRef.current.delete(widgetId);
    }
  };

  const currentSignals = useMemo(
    () => mapCurrentSignals(signals ?? [], Date.now()),
    [signals, expirationRevision],
  );

  useEffect(() => {
    if (signals === undefined) return;

    const scheduleExpirationCheck = () => {
      const now = Date.now();
      const nextExpiration = signals.reduce<number | undefined>(
        (nearest, signal) => {
          if (signal.expiresAt === undefined || signal.expiresAt <= now) {
            return nearest;
          }
          return nearest === undefined
            ? signal.expiresAt
            : Math.min(nearest, signal.expiresAt);
        },
        undefined,
      );

      return nextExpiration === undefined
        ? undefined
        : setTimeout(
            () => setExpirationRevision((revision) => revision + 1),
            Math.max(0, nextExpiration - now),
          );
    };

    let timer = scheduleExpirationCheck();
    const handleVisibilityChange = () => {
      setExpirationRevision((revision) => revision + 1);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [expirationRevision, signals]);

  useEffect(() => {
    const activeWidgetIds = new Set(widgets.map((widget) => widget.id));
    for (const widgetId of pulseTimersRef.current.keys()) {
      if (!activeWidgetIds.has(widgetId)) clearPulseTimer(widgetId);
    }
    for (const widgetId of pulseTrackingRef.current.keys()) {
      if (!activeWidgetIds.has(widgetId)) {
        pulseTrackingRef.current.delete(widgetId);
      }
    }

    if (signals === undefined) {
      for (const widgetId of pulseTimersRef.current.keys()) {
        clearPulseTimer(widgetId);
      }
      pulseTrackingRef.current.clear();
      setVisibility(new Map(widgets.map((widget) => [widget.id, true])));
      return;
    }

    setVisibility((previousVisibility) => {
      const nextVisibility = new Map<string, boolean>();

      for (const widget of widgets) {
        const condition = widget.visibilityCondition;
        if (!condition) {
          clearPulseTimer(widget.id);
          pulseTrackingRef.current.delete(widget.id);
          nextVisibility.set(widget.id, true);
          continue;
        }

        const signal = currentSignals.get(condition.source.key);
        const matched = evaluateVisibilityCondition(condition, currentSignals);

        if (condition.behavior === 'while-matched') {
          clearPulseTimer(widget.id);
          pulseTrackingRef.current.set(widget.id, {
            matched,
            revision: signal?.revision,
          });
          nextVisibility.set(widget.id, matched);
          continue;
        }

        const previousTracking = pulseTrackingRef.current.get(widget.id);
        const shouldTrigger =
          matched &&
          (
            previousTracking === undefined ||
            !previousTracking.matched ||
            previousTracking.revision !== signal?.revision
          );
        pulseTrackingRef.current.set(widget.id, {
          matched,
          revision: signal?.revision,
        });

        if (!signal) {
          clearPulseTimer(widget.id);
          nextVisibility.set(widget.id, false);
          continue;
        }

        if (shouldTrigger) {
          clearPulseTimer(widget.id);
          nextVisibility.set(widget.id, true);
          const durationMs = Math.max(
            0,
            (condition.autoHideSeconds ?? 0) * 1000,
          );
          const timer = setTimeout(() => {
            pulseTimersRef.current.delete(widget.id);
            setVisibility((currentVisibility) => {
              if (currentVisibility.get(widget.id) === false) {
                return currentVisibility;
              }
              const hidden = new Map(currentVisibility);
              hidden.set(widget.id, false);
              return hidden;
            });
          }, durationMs);
          pulseTimersRef.current.set(widget.id, timer);
          continue;
        }

        nextVisibility.set(
          widget.id,
          previousVisibility.get(widget.id) ?? false,
        );
      }

      const unchanged =
        nextVisibility.size === previousVisibility.size &&
        [...nextVisibility].every(
          ([widgetId, visible]) =>
            previousVisibility.get(widgetId) === visible,
        );
      return unchanged ? previousVisibility : nextVisibility;
    });
  }, [currentSignals, signals, widgets]);

  useEffect(
    () => () => {
      for (const timer of pulseTimersRef.current.values()) {
        clearTimeout(timer);
      }
      pulseTimersRef.current.clear();
      pulseTrackingRef.current.clear();
    },
    [],
  );

  return visibility;
}
