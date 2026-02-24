import { describe, expect, it } from 'vitest';
import { resolveLaunchActionState } from './pnl-launch-policy';

describe('launch action policy', () => {
    it('blocks launch when gate is not eligible', () => {
        const state = resolveLaunchActionState({
            gateEligible: false,
            launchSafetyLocked: false,
            authenticated: true,
        });
        expect(state).toBe('blocked_by_gate');
    });

    it('blocks launch by safety lock even when gate passes', () => {
        const state = resolveLaunchActionState({
            gateEligible: true,
            launchSafetyLocked: true,
            authenticated: true,
        });
        expect(state).toBe('blocked_by_lock');
    });

    it('requires wallet connection when gate passes and lock is open', () => {
        const state = resolveLaunchActionState({
            gateEligible: true,
            launchSafetyLocked: false,
            authenticated: false,
        });
        expect(state).toBe('needs_wallet');
    });

    it('is ready only when gate passes, lock is open, and wallet is connected', () => {
        const state = resolveLaunchActionState({
            gateEligible: true,
            launchSafetyLocked: false,
            authenticated: true,
        });
        expect(state).toBe('ready');
    });
});
