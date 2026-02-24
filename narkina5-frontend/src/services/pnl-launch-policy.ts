export type LaunchActionState =
    | 'blocked_by_gate'
    | 'blocked_by_lock'
    | 'needs_wallet'
    | 'ready';

export interface LaunchActionInputs {
    gateEligible: boolean;
    launchSafetyLocked: boolean;
    authenticated: boolean;
}

export function resolveLaunchActionState(inputs: LaunchActionInputs): LaunchActionState {
    if (!inputs.gateEligible) return 'blocked_by_gate';
    if (inputs.launchSafetyLocked) return 'blocked_by_lock';
    if (!inputs.authenticated) return 'needs_wallet';
    return 'ready';
}
