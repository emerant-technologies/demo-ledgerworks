# LedgerWorks

Interactive 3D accounting practice world with a live finance-operations dashboard, a seven-person finance team at work, and a 3-minute guided tour. Bulgarian by default, English available; amounts in EUR.

Built by [Emerant Technologies](https://emerant.net/).

## Run locally

Plain static files, no build step:

```bash
python3 -m http.server 8765
```

Open http://127.0.0.1:8765. URL options: `?lang=en|bg`, `?demo=0` (no auto tour), `?scene=N` (start tour at scene N).

## Deploy

- **GitHub Pages**: every push to `main` publishes via `.github/workflows/pages.yml`.
- **Docker / Coolify**: `docker-compose.yml` (nginx, container port 80, health check at `/healthz`). Local: `docker compose -f docker-compose.yml -f docker-compose.local.yml up --build -d` → http://127.0.0.1:8080.

## Files

| File | Role |
|---|---|
| `engine.js` | Chart of accounts, ledger, scenarios, simulation, team activity, metrics |
| `world.js` | Three.js campus, vehicles, people, camera |
| `ui.js`, `i18n.js`, `styles.css` | Dashboard overlay and EN/BG translations |
| `demo.js`, `demo.css` | Guided tour with scripted cursor |
| `brand.js`, `brand.css` | Emerant byline and promo card |
