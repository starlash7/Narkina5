import type { GraduationGateProfile } from './pnl-gate';
import type { FeedReliabilityMode } from './pnl-market';

export type OperatorPreset = 'standard' | 'production_safe';

export interface OperatorPresetConfig {
    gateProfile: GraduationGateProfile;
    feedReliabilityMode: FeedReliabilityMode;
    launchSafetyLocked: boolean;
}

export const OPERATOR_PRESETS: Record<OperatorPreset, OperatorPresetConfig> = {
    standard: {
        gateProfile: 'relaxed',
        feedReliabilityMode: 'balanced',
        launchSafetyLocked: true,
    },
    production_safe: {
        gateProfile: 'strict',
        feedReliabilityMode: 'strict',
        launchSafetyLocked: true,
    },
};
