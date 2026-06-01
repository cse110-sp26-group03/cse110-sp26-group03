# Manta user guide (static site)

Plain HTML + CSS for GitHub Pages. No build step — edit files and push.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Landing + install |
| `getting-started.html` | Install, first commands, sync workflow |
| `commands.html` | Command reference (`<details>` dropdowns) |
| `reference.html` | Fields and flags (canonical table) |

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
