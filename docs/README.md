# Homesty.ai Docs

This folder contains the engineering and product documentation for the
buyerchat / homesty.ai codebase. Each document focuses on one layer or
concern of the system so you can read only what you need. All documents
are maintained alongside the code; if a document contradicts the source
of truth in `CLAUDE.md` or the root `README.md`, the source file wins —
please open a PR to reconcile.

## Document Index

| File | What it covers |
|---|---|
| [architecture.md](./architecture.md) | System overview, stack versions, directory map, top-level data-flow diagrams |
| [chat-flow.md](./chat-flow.md) | Step-by-step walkthrough of `POST /api/chat` from request to streamed response |
| [decision-engine.md](./decision-engine.md) | Score engine, recommendation, tradeoff, risk, and decision-card pipeline |
| [rag.md](./rag.md) | RAG v1 design: `Embedding` model, `embed-writer`, `retriever`, backfill script |
| [database.md](./database.md) | Prisma schema model reference, index rationale, migration workflow |
| [security.md](./security.md) | Input guardrails, rate limiting, response-checker, admin gate, known gaps |
| [admin.md](./admin.md) | Admin page layout, founder dashboard metrics, follow-up queue, revenue tab |
| [testing.md](./testing.md) | Validation strategy: build check, smoke tests, and manual test matrix |
| [agents.md](./agents.md) | 15-agent fleet roster, startup protocol, commit conventions, report format |

## How to Read These Docs

**New engineers** — follow this reading order to build a mental model before
touching code:

1. `architecture.md` — understand the full system shape and external dependencies
2. `chat-flow.md` — understand the only latency-critical path in the product
3. `rag.md` — understand how the vector store fits into that path

**Product managers / PMs** — start here instead:

1. `admin.md` — what the founder dashboard shows and how metrics are computed
2. `decision-engine.md` — how the AI scores and recommends projects to buyers

For project-level commands, environment variables, and open issues see the root
[`README.md`](../README.md) and [`CLAUDE.md`](../CLAUDE.md).
