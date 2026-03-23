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

| Dimension | What it measures | Source |
|---|---|---|
| **Climate** | How well the country's typical climate matches your temperature and sunshine preferences | National met offices, Wikipedia |
| **LGBTQ+ Legal: Orientation** | Same-sex partnerships, marriage, adoption, anti-discrimination law | [Equaldex](https://equaldex.com) |
| **LGBTQ+ Legal: Gender Identity** | Legal gender recognition, trans healthcare access, non-binary recognition | [ILGA World](https://ilga.org), [TGEU](https://tgeu.org) |
| **LGBTQ+ Social Acceptance** | How accepted LGBTQ+ people are in daily life, public attitude surveys | [Equaldex](https://equaldex.com), Pew Research |
| **Racial Experience** | Reported social comfort and safety for your racial background | US State Dept. Human Rights Reports, ECRI, FRA |
| **Safety** | Crime rates, violent crime, political stability | [Global Peace Index](https://visionofhumanity.org) |
| **Healthcare** | Quality of and access to public healthcare | WHO, [Numbeo](https://numbeo.com) |
| **Cost / Value** | Quality of life relative to cost of living | [Numbeo](https://numbeo.com), Expatistan |
| **Visa / Residency** | Ease of legally relocating, digital nomad and residency options | Visaguide.world, official immigration portals |

LGBTQ+ legal and social data is fetched live from the [Equaldex API](https://equaldex.com) on every visit when available, falling back to built-in data otherwise.

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
- [Equaldex API](https://equaldex.com/api) for live LGBTQ+ data
- GitHub Actions for CI/CD
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
