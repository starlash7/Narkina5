// Narkina5 Design System - Shared Constants

export const colors = {
  primary: '#ff6b35',
  primaryLight: '#ff8555',

  bg: '#0a0a0a',
  bgDark: '#111111',
  bgCard: '#1a1a1a',

  text: '#e5e5e5',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',

  success: '#22c55e',
  info: '#3b82f6',
  warning: '#eab308',
  error: '#ef4444',
  purple: '#8b5cf6',
} as const;

export const gradients = {
  primary: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryLight})`,
} as const;

export function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Solana
export const SOLANA_RPC = 'https://api.devnet.solana.com';
export const SOLANA_NETWORK = 'devnet';
export const CONTRACT_ADDRESS = 'EaVBaKvaimQs88sNVpjutm2sCxsnyxdR7kQQBxy9Qh24';
