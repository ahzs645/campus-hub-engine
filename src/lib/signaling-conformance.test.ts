import { describe, expect, it } from 'vitest';
import { createSignalingClient } from './signaling-client';
import type { SignalingClient, SignalingConfig } from './signaling-client';
import type {
  SignalingClient as SdkSignalingClient,
  SignalingConfig as SdkSignalingConfig,
  CreateSignalingClientOptions as SdkOptions,
  SignalingRole as SdkRole,
} from '@firstform/campus-hub-widget-sdk';

/**
 * The SDK declares the signaling surface itself rather than re-exporting it
 * from here, so that a widget package can typecheck with only the SDK
 * installed. That leaves two definitions that must not drift.
 *
 * This is the seam where both are visible, so the assertions live here. They
 * are compile-time checks — if they stop holding, this file fails to typecheck
 * rather than a widget failing at a call site.
 */

// Mutual assignability: neither side may add, drop or retype a member.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

const clientsMatch: Exact<SignalingClient, SdkSignalingClient> = true;
const configsMatch: Exact<SignalingConfig, SdkSignalingConfig> = true;

// The factory the SDK loads at runtime must accept what the SDK's signature
// promises callers it will.
const factoryMatches: Exact<
  Parameters<typeof createSignalingClient>,
  [serverUrl: string, role: SdkRole, displayId: string, options?: SdkOptions]
> = true;

const returnMatches: Exact<ReturnType<typeof createSignalingClient>, SdkSignalingClient> = true;

describe('signaling surface conformance', () => {
  it('keeps the engine implementation and the SDK declaration identical', () => {
    // The real assertions are the types above; this keeps the values used so
    // the file is not dead code, and gives the check a name in the report.
    expect([clientsMatch, configsMatch, factoryMatches, returnMatches]).toEqual([
      true, true, true, true,
    ]);
  });

  it('exposes the factory the SDK expects to find', () => {
    expect(createSignalingClient).toBeTypeOf('function');
  });
});
