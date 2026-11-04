# Development guide

The canonical online source is the root `index.html`, `style.css`, `game.js` and the `assets/` folder. Do not edit any previously generated 14 MB standalone HTML; it is a release artifact rather than the source of truth.

## Local development

```bash
python -m http.server 8080
```

Open http://localhost:8080. Chrome/Edge with WebGL 2 is required.

## Quality gate

```bash
node --check game.js
python tests/verify_distribution.py
```

GitHub Actions runs checks on every push and pull request and deploys the main branch to GitHub Pages. Current release is a **playable prototype**, not a commercial-grade fishing simulation.

## Assets

All texture and sound files are kept under `assets/`. For web load performance, the high-resolution water normals texture in the standalone prototype has been replaced here by a smaller generated normal map. This is a deliberately equivalent-purpose but not pixel-identical texture.

## Branches

Create one feature branch per substantial change. Submit a pull request, inspect the visual effect in browser, and merge only when it passes checks.
