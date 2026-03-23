# 🌈 ThriveMap

**Find the countries where you can live freely as yourself.**

ThriveMap is a free, open tool for LGBTQ+ people and people of colour who are thinking about relocating — or who simply want to know where in the world they would be most safe, welcome, and able to thrive.

---

## Why this exists

With rights and freedoms shifting rapidly across the world — formerly progressive countries becoming more restrictive, new protections emerging in unexpected places — it can be overwhelming to figure out where you would actually be safe, accepted, and able to build a life.

ThriveMap was built by a lesbian mixed-race couple navigating exactly this question. It grew out of personal research and a desire to make that research useful for others facing the same challenges.

It is not a travel guide, but a starting point for people who need to ask: *where could we go?*

---

## How it works

### 1. Build your profile
Set up a profile for 1 or 2 people. Each person selects their gender identity, sexual orientation, and racial background. Your answers never leave your browser — nothing is stored or sent anywhere.

### 2. Set your priorities
Adjust importance sliders across nine dimensions of livability. Defaults are automatically suggested based on your profile — a lesbian couple of colour will get higher weights on LGBTQ+ and racial dimensions by default. You can tune everything yourself.

### 3. See your results
Countries are scored and ranked from best fit to worst. You can expand any country to see a breakdown across all nine dimensions. Clicking a dimension card shows a country-specific explanation and links to authoritative sources.

---

## What is scored

| Dimension | What it measures | Primary source |
|---|---|---|
| **Climate** | How well the country's typical climate matches your temperature and sunshine preferences | National met offices |
| **LGBTQ+ Legal: Orientation** | Same-sex partnerships, marriage, adoption, anti-discrimination law | [Equaldex](https://equaldex.com) · [ILGA-Europe Rainbow Map](https://rainbowmap.ilga-europe.org) |
| **LGBTQ+ Legal: Gender Identity** | Legal gender recognition, trans healthcare access, non-binary recognition | [ILGA World](https://ilga.org) · [TGEU](https://tgeu.org) |
| **LGBTQ+ Social Acceptance** | How accepted LGBTQ+ people are in daily life, public attitude surveys | [Equaldex](https://equaldex.com) · Pew Research |
| **Racial Experience** | Reported social comfort and safety for your racial background | US State Dept. Human Rights Reports · ECRI · FRA |
| **Safety** | Political stability, violent crime, and militarisation | [World Bank](https://data.worldbank.org/indicator/PV.EST) · [Global Peace Index](https://visionofhumanity.org) |
| **Healthcare** | Quality of and access to public healthcare | [WHO Global Health Observatory](https://www.who.int/data/gho) |
| **Cost / Value** | Quality of life relative to cost of living | Numbeo · Expatistan |
| **Visa / Residency** | Ease of legally relocating, digital nomad and residency options | Visaguide.world · official immigration portals |

---

## How data is kept up to date

ThriveMap uses a layered data strategy. Scores are never just a static snapshot — they are updated automatically from multiple sources on different cadences.

### On every visit — live API calls
Three APIs are called in parallel each time the app loads:

- **[Equaldex](https://equaldex.com/api)** — LGBTQ+ legal rights and social acceptance scores for all countries. Updated continuously by Equaldex as laws change.
- **[WHO Global Health Observatory](https://ghoapi.azureedge.net/api/UHC_INDEX_REPORTED_WHO)** — UHC Service Coverage Index, the WHO's measure of universal healthcare access. Updated annually by the WHO.
- **[World Bank](https://data.worldbank.org/indicator/PV.EST)** — Political Stability and Absence of Violence index. Updated annually from the Worldwide Governance Indicators project.

If any live call fails, the app falls back to the built-in dataset silently. The footer shows a live or built-in indicator for each source so you can always see what you're looking at.

### Every July — automated annual update
Two sources publish data annually that cannot be fetched as a live API. A GitHub Actions workflow runs automatically on 1 July each year and handles both:

- **[Global Peace Index](https://visionofhumanity.org/resources/)** (Institute for Economics & Peace, published June) — a broad measure of peacefulness covering crime, conflict, and militarisation. Blended 50/50 with the World Bank political stability score to produce the Safety dimension.
- **[ILGA-Europe Rainbow Map](https://rainbowmap.ilga-europe.org)** (published May) — the most authoritative annual ranking of LGBTQ+ legal and policy equality across Europe. Used to update the LGBTQ+ legal score for all European countries covered by the map.

The workflow downloads both sources, normalises them to ThriveMap's 0–100 scale, writes the result to `src/data/external-scores.json`, commits directly to `main`, and triggers a full rebuild and redeploy to GitHub Pages — all without any manual steps. The automation lives in `.github/workflows/update-external-scores.yml` and can also be triggered manually from the Actions tab at any time.

---

## Important disclaimer

Scores are compiled from publicly available indices and represent **generalisations**. Racial experience scores reflect aggregate reported experiences across groups — they do not predict any individual's experience. Laws and social attitudes change. While we try to keep this up to date, always verify current conditions before making any relocation decision. Clicking any score card in the results opens country-specific context and direct links to the underlying sources.

---

## Running locally

```bash
git clone https://github.com/Kimmymore/Thrivemap.git
cd Thrivemap
npm install
npm run dev
```

The Equaldex API key is injected at build time via the `VITE_EQUALDEX_API_KEY` environment variable. For local development, create a `.env.local` file:

```
VITE_EQUALDEX_API_KEY=your_key_here
```

Without a key the app falls back to the built-in dataset.

---

## Data coverage

Country-specific explanations (shown when you click a score card) are being added in batches, alphabetically. The first two batches cover **Albania → Greece**. All other countries show score-based fallback text with standard source links. More countries will be added over time.

---

## Tech stack

- [React 19](https://react.dev) + [Vite 8](https://vite.dev)
- Pure CSS (no framework)
- [Equaldex API](https://equaldex.com/api) — live LGBTQ+ data
- [WHO GHO API](https://www.who.int/data/gho) — live healthcare data
- [World Bank API](https://data.worldbank.org) — live safety data
- GitHub Actions for CI/CD and annual data updates
- GitHub Pages for hosting

---

## Contributing

Contributions are welcome — particularly:
- Country detail text for the remaining countries (see `src/data/countryDetails.js`)
- Corrections to scores or factual errors
- Translations

Please open an issue or pull request on GitHub.

---

*Made with ❤️ for everyone who deserves a place to thrive.*
