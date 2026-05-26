# Lantern — Claude Code Instructions

## Doc sync — MANDATORY at every session end

After completing any session work, sync all docs from the active worktree to the canonical docs directory before reporting the session as done. No exceptions.

```bash
WORKTREE="<active worktree path>/docs"
DEST=~/Projects/lantern/docs

cp "$WORKTREE/SESSION_NOTES.md"      "$DEST/SESSION_NOTES.md"
cp "$WORKTREE/ROADMAP.md"            "$DEST/ROADMAP.md"
cp "$WORKTREE/CHATGPT_HANDOFF.md"    "$DEST/CHATGPT_HANDOFF.md"
cp "$WORKTREE/PRODUCT_FOUNDATION.md" "$DEST/PRODUCT_FOUNDATION.md"
cp "$WORKTREE/DESIGN_SYSTEM.md"      "$DEST/DESIGN_SYSTEM.md"
cp "$WORKTREE/AI_COMPANION_RULES.md" "$DEST/AI_COMPANION_RULES.md"
cp "$WORKTREE/ARCHITECTURE.md"       "$DEST/ARCHITECTURE.md"
```

**Canonical location:** `~/Projects/lantern/docs/`
**Handoff file the user picks up:** `~/Projects/lantern/docs/CHATGPT_HANDOFF.md`

This file is the connective tissue between Claude Code (developer) and ChatGPT (strategist). The user is the liaison. They grab this file from the same location every session. Keep it current.

---

## localStorage keys — FROZEN

`shadowscribe_books` and `shadowscribe_settings` must not be renamed without an explicit migration plan.

---

## Build command

```bash
cd <worktree path>
node ~/Projects/lantern/node_modules/vite/bin/vite.js build
```

`.bin/vite` is not a real symlink in this project.

---

## Product name

Lantern (renamed from Shadow Scribe in Session 49). `shadowscribe_*` localStorage keys are frozen.
