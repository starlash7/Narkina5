# Narkina5 Execution Plan (High-Priority Operating Reference)

Source reference:
- https://gist.github.com/garrytan/120bdbbd17e1b3abd5332391d77963e7

## Operating Mode

Default mode for Narkina5 is `HOLD_SCOPE`.

Interpretation for this repo:
- No broad rewrites without a written scope delta.
- Prefer stability, determinism, and resilience over feature volume.
- Any large change must include rollback notes and a focused risk list.

Primary external objective:
- Optimize execution for the Bags Hackathon ranking model:
  - onchain performance
  - app traction
  - verified and publicly auditable shipping
  - deeper Bags integration

## Per-Session Start Checklist

1. Run quick system audit:
   - `git log --oneline -30`
   - `git diff main --stat`
   - `git stash list`
   - TODO/FIXME scan
2. Confirm session objective and blast radius.
3. Update `TODOS.md` before coding.
4. Implement one narrow, high-impact slice.
5. Record decisions and unresolved risks in commit message or PR notes.

## Narkina5 Current Mapping (Done vs Next)

Done:
- Cell strategy archetypes and behavior diversification are integrated.
- Market regime-aware decisioning and risk-off handling are integrated.
- Graduation gate policy is separated and tested.
- Launch readiness policy is separated and tested.
- Operator presets and UI launch safety controls are integrated.
- README architecture and workflow docs are updated.

Next (priority order):
1. Bags integration path hardening (token/API/fee-sharing compatibility).
2. Error/Recovery map hardening for launch path and market path.
3. Reproducibility hardening: deterministic season replay artifact improvements.
4. Portfolio safety hardening: exposure/position concentration constraints tuning.
5. Runtime performance: chunk split strategy and heavy dependency load isolation.

## Recovery Protocol (When a change fails)

1. Stop and classify: build failure, runtime failure, behavior regression, or infra.
2. Isolate by recent commit and affected file scope.
3. Apply smallest reversible patch first.
4. Re-run only necessary checks.
5. Log root cause and prevention item in `TODOS.md`.

## Definition of Progress

A task counts as complete only when:
- Scope is explicit.
- Risk impact is stated.
- Test/build signal is clean enough for the target environment.
- Follow-up backlog is updated with next concrete step.
