# Two-Phase Sprint Pattern

> Sprints with uncertainty (refactors, ambiguous bugs, new features
> with multiple options) waste tokens when investigation and
> implementation are crammed into one prompt. Split them.

## Phase 1 — Investigation prompt (cheap, no code changes)

Goal: understand the problem. Output: a diagnostic doc the operator
reviews before approving Phase 2.

```
SPRINT <NAME>-INVESTIGATE

PRE-FLIGHT (per docs/AGENT_DISCIPLINE.md):
1. Read docs/SESSION_HANDOFF.md
2. Read docs/AGENT_DISCIPLINE.md sections that apply
3. State which sections apply in your first response
4. Report format: §14 verdict + 3-line summary
5. Confidence ≥ 80% on default → proceed (document); else [NEEDS DECISION]
6. NEVER autonomous on destructive operations

GOAL: Understand <X>. Produce docs/diagnostics/<name>-investigation.md.

DO NOT modify code. DO NOT commit anything except the diagnostic doc.

INVESTIGATE:
1. <specific grep / read commands>
2. <expected file:line refs>
3. <questions to answer>

OUTPUT FORMAT (in the doc):
## Findings (file:line refs)
## Options (2-3 with pros/cons)
## Recommendation (with confidence %)
## Estimated effort if Option N

REPORT BACK: [OK] / [NEEDS DECISION] + 3 lines + diagnostic doc path
```

## Phase 2 — Surgical fix prompt (concentrated)

Goal: apply the chosen fix. Output: 1-2 commits.

```
SPRINT <NAME>-IMPLEMENT

PRE-FLIGHT (same 8-line header as Phase 1)

CONTEXT: docs/diagnostics/<name>-investigation.md (read first)

DECISION: Option <N> chosen because <reason>.

TASK:
- File:line specific changes (no investigation; phase 1 did it)
- Test additions
- Verification: npm run verify

REPORT BACK: [OK] / [PARTIAL] / [BLOCKED]
+ 3 lines + commit SHA + SESSION_HANDOFF.md updated
```

## When to skip Phase 1

- Surgical bug fix with known file:line and known fix. Just write Phase 2.
- One-line copy edit. Just do it.
- Anything where the operator has already supplied the option choice
  ("apply Option 1 from the diagnosis doc").

## When to ALWAYS do Phase 1 first

- Refactors touching ≥3 files.
- Schema changes.
- Anything where you'd otherwise put "Option A vs B vs C" in the
  prompt and ask the operator to pick.
- New features without a written spec.

---

# Permanent Prompt Header (paste at top of every sprint)

```
PRE-FLIGHT:
1. Read docs/SESSION_HANDOFF.md
2. Read docs/AGENT_DISCIPLINE.md (sections that apply)
3. State which sections apply in your first response
4. Run npm run verify before claiming completion
5. Report format: §14 verdict + 3-line summary + diagnostic doc link
6. Update docs/SESSION_HANDOFF.md before exit
7. If 80%+ confident on a default option, proceed (document in commit)
8. NEVER autonomous on destructive actions — always escalate
```

That's the contract every future sprint enforces.
