# Lantern — A Literary Companion

A quiet reading companion that sits alongside you as you read.

Keep notes, track chapters, and let the text accumulate meaning over time.

## What it is

Lantern is a local-first web app for readers who want a thoughtful companion for their books — not a social network, not a database, not a productivity tool. It holds your notes, marks your progress, and occasionally surfaces quiet observations drawn from what you've read.

AI features (character extraction, companion reflections, discussion questions) use the Anthropic API with your own key. Everything else works offline.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:5230](http://localhost:5230).

To use AI features, go to Settings and paste your [Anthropic API key](https://console.anthropic.com).

## Environment variables

See [`.env.example`](.env.example). All variables are optional — Lantern works without any of them.

| Variable | Purpose |
|---|---|
| `VITE_PLAUSIBLE_DOMAIN` | Enables Plausible Analytics on your domain |
| `VITE_FEEDBACK_URL` | Shows a feedback link in Settings |

## Deployment

Lantern deploys to Vercel as a static SPA. The `vercel.json` includes the SPA rewrite rule.

```bash
npm run build
```

Output is in `dist/`.

## Architecture

- React 19 + Vite + Tailwind CSS 4
- `localStorage` for all persistence (no backend, no database)
- Anthropic API via browser fetch (BYOK — user provides their own key)
- React Router for SPA routing

## Data model

All reading companions, notes, and progress live in `localStorage` under the key `lantern_books`. Users can export and import their full library as JSON from Settings.
