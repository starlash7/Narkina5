# Narkina5 TODOs (Priority-Driven)

Updated: 2026-03-09 (Asia/Seoul)

## P0 - Immediate

- [~] Launch error map:
  - Done: typed failure classes for `/api/pumpfun` and frontend `pumpfun` service.
  - Next: map wallet signing flow failures into the same retry taxonomy.
  - Expose actionable UI messages for retry vs stop.
  - Files: `api/pumpfun.ts`, `narkina5-frontend/src/services/pumpfun.ts`, `narkina5-frontend/src/pages/PnLArena.tsx`

- [ ] Market feed recovery policy:
  - Add explicit fallback reason codes and degraded-mode flag propagation.
  - Ensure gate decisions log feed-quality evidence in receipt.
  - Files: `api/market.ts`, `narkina5-frontend/src/services/pnl-market.ts`, `narkina5-frontend/src/pages/PnLArena.tsx`

## P1 - High

- [ ] Season reproducibility artifact:
  - Export deterministic seed, policy version, and top decision traces for replay.
  - File: `narkina5-frontend/src/pages/PnLArena.tsx`

- [ ] Position risk concentration pass:
  - Tune exposure guardrails for late-floor survival consistency.
  - File: `narkina5-frontend/src/services/pnl-competition.ts`

- [ ] Strategy telemetry panel:
  - Display cell archetype + current market regime + risk-off state in live UI.
  - File: `narkina5-frontend/src/pages/PnLArena.tsx`

## P2 - Medium

- [ ] Frontend bundle optimization:
  - Split heavy auth/wallet modules by route boundaries.
  - File: `narkina5-frontend/vite.config.ts`, route-level lazy import points

- [ ] Agent profile polish:
  - Replace placeholder avatar in agent character config.
  - File: `narkina5-agent/src/character.ts`

## Working Rule

- Follow `plan.md` as primary execution reference.
- Before coding, choose one item from highest non-empty priority bucket.
