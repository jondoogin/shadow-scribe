Read `/Users/johnduggan/Projects/lantern/docs/CHATGPT_HANDOFF.md` to get current, then do a quick verification pass on the most recent sessions listed there. Flag anything broken or rough before we start new work.

After the verification pass, here are the priority areas for this session — pick the top one or ask me which to start:

1. **Plot tab experience** — The summary generation button exists but there's no guidance pointing users to it. Books with no summaries expand to "No summary yet." everywhere. Needs a proactive callout or better empty state.
2. **Dark mode audit** — CompletionBand, Chronicle, and the focus ring changes were built and tested in light mode only. Dark mode gaps are common with new surfaces.
3. **Completion moment** — Marking a book finished silently flips to CompletionBand. There's no transition, no arrival beat. The moment deserves something — even a brief animation or a final companion prompt.
4. **Library card for finished books** — The library grid shows finished books but the card doesn't reflect the reading record. Consider surfacing completion date, note count, or a brief echo of the CompletionBand reflection.
5. **Chapter update flow audit** — The chapter completion toggle was removed from the Chronicle tab. ChapterUpdateModal is now the sole path for marking chapters done. Verify it's complete and discoverable enough to carry that responsibility alone.
6. **Empty states pass** — Notes, Plot, Chronicle, and Threads all have empty states. Audit them for consistency of voice, helpfulness, and correct depth-level gating (Quiet vs. Resonant).
7. **Mobile/responsive check** — CompletionBand and Chronicle haven't been reviewed at mobile widths. The sticky tab bar and reading arc stats need checking at 375px.
