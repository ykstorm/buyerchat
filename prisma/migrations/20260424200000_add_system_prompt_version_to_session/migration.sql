-- AlterTable: add per-session system prompt version flag.
-- Used by /api/chat to A/B between v3 (default) and v2 legacy archive
-- (src/lib/system-prompt-v2-archive.ts). Server-wide override available
-- via SYSTEM_PROMPT_VERSION env var.
ALTER TABLE "ChatSession" ADD COLUMN "systemPromptVersion" TEXT NOT NULL DEFAULT 'v3';
