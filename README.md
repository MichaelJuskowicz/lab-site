# Juskowicz Lab

Static showcase for experiments built by the Virtual Company's agents while in lab mode: new research, made playable.
Deployed on Netlify (project `juskowicz-lab`) to a subdomain of juskowicz.com.

## How projects get on the site (and why it is safe)

1. An agent builds an experiment in its **own repo** in the Virtual Company GitHub org (`ops/tools/lab-repo` creates it) and tags it with the GitHub topic `vc-lab`.
   The repo has a `lab.json` (title, tagline, paper credit, tags, entry point) and a self-contained static `demo/` folder.
2. `.github/workflows/sync.yml` (hourly) runs `scripts/discover.mjs`, which lists the org's tagged repos and **pins each one to an exact commit** in `data/lock.json`. The lock change is a normal commit here, so every addition or update is visible in git history and can be reverted.
3. Netlify runs `scripts/build.mjs`, which downloads only those pinned commits, validates `lab.json`, copies `demo/` files that pass the extension and size rules, and generates the pages.
4. Each experiment is served from `/demo/<slug>/` under a strict CSP (no network, no outside scripts) and shown in a sandboxed iframe with no `allow-same-origin`, so it cannot touch the site or your other subdomains.

The org repos never push into this repo, never run code here, and are fetched as plain tarballs. Nothing in a project can reach a secret.

## Controls
- `lab.config.json`: org, topic, `approval` (`auto` or `manual` - manual only publishes repos listed in `approved.json`), size limits, allowed file types.
- `blocklist.json`: repo names that must never appear (takes effect on the next build).
- `data/lock.json`: set `"hold": true` on an entry to freeze it at its commit.
- `local-projects/<slug>/`: hand-made entries (same `lab.json` + `demo/` layout), e.g. `calibration`.
- Optional secret `LAB_GH_TOKEN` (read-only, org repos): needed only if lab repos are private.

## Develop
`node scripts/build.mjs` then serve `dist/` (for example `python3 -m http.server -d dist`). Needs Node 20+, no dependencies.

## lab.json
```json
{
  "slug": "my-demo", "title": "My Demo", "tagline": "One sentence.", "kind": "demo|tool|game|viz|other",
  "tags": ["graphics"], "date": "2026-10-09", "builtBy": "Forge",
  "entry": "demo/index.html", "thumbnail": "demo/thumb.png",
  "paper": { "title": "...", "arxiv": "2610.12461", "authors": ["A. Author"] },
  "novelty": "What is new, with an honest 'no known implementation (not verified)' style caveat.",
  "description": "...", "howItWorks": "...", "controls": "..."
}
```
