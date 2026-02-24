import type { GraduationGateProfile } from './pnl-gate';
import type { FeedReliabilityMode } from './pnl-market';

export type OperatorPreset = 'hackathon_demo' | 'production_safe';

export interface OperatorPresetConfig {
    gateProfile: GraduationGateProfile;
    feedReliabilityMode: FeedReliabilityMode;
    launchSafetyLocked: boolean;
}

export const OPERATOR_PRESETS: Record<OperatorPreset, OperatorPresetConfig> = {
    hackathon_demo: {
        gateProfile: 'hackathon',
        feedReliabilityMode: 'balanced',
        launchSafetyLocked: true,
    },
    production_safe: {
        gateProfile: 'strict',
        feedReliabilityMode: 'strict',
        launchSafetyLocked: true,
    },
};
