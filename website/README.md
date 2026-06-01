# Manta user guide (static site)

Plain HTML + CSS for GitHub Pages. No build step — edit files and push.

## Structure

| Path | Purpose |
|------|---------|
| `index.html` | Landing hero + feature cards |
| `getting-started.html` | Step-by-step install guide |
| `commands.html` | **All commands** — cheat sheet, cards, expandable details |
| `reference.html` | Fields and flags (canonical table) |
| `components/` | Shared header & footer (loaded via `js/include.js`) |
| `css/style.css` | Layout, cards, badges, dark code blocks |

## Local preview

Open any `.html` file in a browser, or from this folder:

```bash
cd website && python3 -m http.server 8080
# http://localhost:8080
```

## Deploy

1. Merge changes on `main` under `website/`.
2. The [Deploy GitHub Pages](../.github/workflows/pages.yml) workflow runs automatically.
3. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

Live URL (after first deploy):

`https://cse110-sp26-group03.github.io/cse110-sp26-group03/`

## Updating content

When you add a CLI flag or command, update `commands.html` and/or `reference.html`. Keep the README short and link here.
