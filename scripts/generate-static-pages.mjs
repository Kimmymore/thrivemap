/**
 * generate-static-pages.mjs
 *
 * Runs after `vite build`. Generates static, crawlable HTML pages into dist/
 * from the country dataset, plus sitemap.xml and llms.txt.
 *
 * Why: the app itself is client-rendered React, which most AI crawlers
 * (GPTBot, ClaudeBot, PerplexityBot) cannot execute. These static pages give
 * search engines and AI assistants real content to index and cite.
 *
 * Generated:
 *   dist/about/index.html
 *   dist/methodology/index.html
 *   dist/countries/index.html
 *   dist/countries/<slug>/index.html   (one per country)
 *   dist/sitemap.xml
 *   dist/llms.txt
 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { COUNTRIES } from '../src/data/countries.js';
import { COUNTRY_DETAILS, STANDARD_SOURCES } from '../src/data/countryDetails.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const SITE = 'https://www.thrivemap.app';
const BUILD_DATE = new Date().toISOString().slice(0, 10);

if (!existsSync(DIST)) {
  console.error('dist/ not found. Run `vite build` first.');
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// Countries whose English name takes a definite article in prose
const TAKES_THE = new Set(['Netherlands', 'United Kingdom', 'United States', 'Philippines', 'Seychelles']);
const inName = (name) => (TAKES_THE.has(name) ? `the ${name}` : name);

const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const DIMENSIONS = [
  ['lgbtq_orient', 'LGBTQ+ legal rights: sexual orientation'],
  ['lgbtq_gender', 'LGBTQ+ legal rights: gender identity'],
  ['lgbtq_social', 'LGBTQ+ social acceptance'],
  ['racial', 'Racial experience'],
  ['safety', 'Safety'],
  ['healthcare', 'Healthcare'],
  ['cost_value', 'Cost / value'],
  ['visa', 'Visa / residency'],
  ['climate', 'Climate'],
];

const RACIAL_LABELS = {
  white: 'White', black: 'Black', mixed_bw: 'Mixed (Black / White)',
  asian: 'East / Southeast Asian', south_asian: 'South Asian',
  hispanic: 'Hispanic / Latino', mena: 'Middle Eastern / North African',
};

const scoreBar = (score) => `
  <div class="bar"><div class="bar-fill" style="width:${score}%"></div></div>
  <span class="score-num">${score}</span>`;

// ── Shared page template ─────────────────────────────────────────────────────

const CSS = `
  :root{--bg:#fafaf9;--surface:#fff;--border:#e5e4e2;--text:#2c2c2c;--soft:#6b6b6b;
    --primary:#5c4de8;--primary-dark:#4538cc;--primary-bg:#f0eefe}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--text);
    font-family:system-ui,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;line-height:1.65}
  header{background:var(--surface);border-bottom:1px solid var(--border);padding:14px 24px}
  header .inner,main,footer .inner{max-width:760px;margin:0 auto}
  header a{color:var(--text);text-decoration:none;margin-right:18px;font-size:.95rem}
  header a.logo{color:var(--primary);font-weight:700;font-size:1.05rem}
  header a:hover{color:var(--primary)}
  main{padding:36px 24px 64px}
  h1{font-size:1.9rem;line-height:1.25;margin:.2em 0 .4em}
  h2{font-size:1.25rem;margin-top:2em;border-bottom:1px solid var(--border);padding-bottom:.3em}
  a{color:var(--primary-dark)}
  .lead{font-size:1.08rem;color:var(--soft)}
  table{border-collapse:collapse;width:100%;margin:1em 0}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);font-size:.95rem;vertical-align:middle}
  th{color:var(--soft);font-weight:600}
  .bar{display:inline-block;width:120px;height:8px;background:var(--primary-bg);border-radius:4px;vertical-align:middle;margin-right:8px}
  .bar-fill{height:8px;background:var(--primary);border-radius:4px}
  .score-num{font-variant-numeric:tabular-nums;font-weight:600}
  .sources{font-size:.88rem;color:var(--soft)}
  .sources a{color:var(--soft)}
  .note{background:var(--primary-bg);border-radius:8px;padding:14px 18px;font-size:.92rem}
  .cta{display:inline-block;background:var(--primary);color:#fff;text-decoration:none;
    padding:12px 22px;border-radius:8px;font-weight:600;margin:1.2em 0}
  .cta:hover{background:var(--primary-dark)}
  .country-list{columns:2;column-gap:32px;padding-left:1.2em}
  @media(max-width:600px){.country-list{columns:1}}
  footer{border-top:1px solid var(--border);padding:20px 24px;color:var(--soft);font-size:.85rem}
`;

function page({ title, description, path, body, jsonLd }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta property="og:type" content="article">
<meta property="og:site_name" content="ThriveMap">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#5c4de8">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
<style>${CSS}</style>
</head>
<body>
<header><div class="inner">
  <a class="logo" href="/">🌈 ThriveMap</a>
  <a href="/countries/">Countries</a>
  <a href="/methodology/">Methodology</a>
  <a href="/about/">About</a>
</div></header>
<main>
${body}
</main>
<footer><div class="inner">
  ThriveMap is free and open source (<a href="https://github.com/Kimmymore/Thrivemap">GitHub</a>).
  Scores are indicative, compiled from public sources, and no substitute for your own research.
  Data snapshot: ${BUILD_DATE}. The <a href="/">interactive app</a> also fetches live data from Equaldex, the WHO and the World Bank.
</div></footer>
</body>
</html>`;
}

const breadcrumbs = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({
    '@type': 'ListItem', position: i + 1, name, item: `${SITE}${url}`,
  })),
});

function write(relPath, html) {
  const file = join(DIST, relPath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

// ── Country pages ────────────────────────────────────────────────────────────

function getSources(code, dim) {
  const specific = COUNTRY_DETAILS[code]?.[dim]?.sources || [];
  const standard = STANDARD_SOURCES[dim] || [];
  const seen = new Set();
  return [...specific, ...standard].filter((s) => !seen.has(s.url) && seen.add(s.url));
}

function countryPage(c) {
  const slug = slugify(c.name);
  const path = `/countries/${slug}/`;
  const details = COUNTRY_DETAILS[c.code] || {};
  const racialAvg = Math.round(
    Object.values(c.racial).reduce((a, b) => a + b, 0) / Object.values(c.racial).length
  );

  const scoreRows = DIMENSIONS
    .filter(([key]) => key !== 'climate')
    .map(([key, label]) => {
      const score = key === 'racial' ? racialAvg : c[key];
      const suffix = key === 'racial' ? ' (average across backgrounds)' : '';
      return `<tr><td>${esc(label)}${suffix}</td><td>${scoreBar(score)}</td></tr>`;
    })
    .join('\n');

  const racialRows = Object.entries(c.racial)
    .map(([k, v]) => `<tr><td>${esc(RACIAL_LABELS[k] || k)}</td><td>${scoreBar(v)}</td></tr>`)
    .join('\n');

  const dimSections = DIMENSIONS.map(([key, label]) => {
    const detail = details[key];
    if (!detail?.text) return '';
    const sources = getSources(c.code, key)
      .map((s) => `<a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a>`)
      .join(' · ');
    return `
<h2>${esc(label)}</h2>
<p>${esc(detail.text)}</p>
${sources ? `<p class="sources">Sources: ${sources}</p>` : ''}`;
  }).join('\n');

  const orientText = details.lgbtq_orient?.text || '';
  const description = (`${c.name}: LGBTQ+ rights, social acceptance, racial experience, safety, healthcare, cost and visa options for people considering relocation. ${orientText}`).slice(0, 158);

  const body = `
<nav class="sources"><a href="/countries/">Back to all countries</a></nav>
<h1>${c.flag} Living in ${esc(inName(c.name))} as an LGBTQ+ person</h1>
<p class="lead">${esc(c.region)} · Equaldex Equality Index: ${c.ei}/100 · Typical annual average ${c.avg_temp_c}°C, ${c.sun_hours} sun hours/day</p>

<p>How ${esc(inName(c.name))} scores across the dimensions ThriveMap measures (0–100, higher is more welcoming). These are baseline scores from public indices. The <a href="/">interactive app</a> personalises them to your profile and priorities and refreshes them with live data.</p>

<table>
<tr><th>Dimension</th><th>Score</th></tr>
${scoreRows}
</table>

<h2>Racial experience by background</h2>
<p class="sources">These scores reflect reported social experience per group, compiled from aggregate research (US State Dept. human rights reports, ECRI, FRA). They are generalisations and do not reflect every individual's experience.</p>
<table>
<tr><th>Background</th><th>Score</th></tr>
${racialRows}
</table>

${dimSections}

<a class="cta" href="/">Get your personalised ranking</a>

<p class="note">ThriveMap is a starting point, not a guarantee. Laws and social conditions change. Always verify current conditions through the linked sources before travelling or relocating.</p>`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `Living in ${inName(c.name)} as an LGBTQ+ person`,
      description,
      url: `${SITE}${path}`,
      dateModified: BUILD_DATE,
      about: { '@type': 'Country', name: c.name },
      isPartOf: { '@id': `${SITE}/#website` },
      author: { '@type': 'Organization', name: 'ThriveMap', url: SITE },
    },
    breadcrumbs([['Home', '/'], ['Countries', '/countries/'], [c.name, path]]),
  ];

  write(`countries/${slug}/index.html`, page({
    title: `Living in ${inName(c.name)} as an LGBTQ+ person: rights, safety and livability | ThriveMap`,
    description,
    path,
    body,
    jsonLd,
  }));
  return { slug, path };
}

// ── Countries index ──────────────────────────────────────────────────────────

function countriesIndex(entries) {
  const byRegion = {};
  for (const c of COUNTRIES) (byRegion[c.region] ||= []).push(c);

  const sections = Object.entries(byRegion).map(([region, list]) => `
<h2>${esc(region)}</h2>
<ul class="country-list">
${list.map((c) => `<li><a href="/countries/${slugify(c.name)}/">${c.flag} ${esc(c.name)}</a>: Equality Index ${c.ei}/100</li>`).join('\n')}
</ul>`).join('\n');

  const body = `
<h1>Country guides for LGBTQ+ relocation</h1>
<p class="lead">All ${COUNTRIES.length} countries in the ThriveMap dataset: every country where same-sex relations are legal (or decriminalised) for both men and women. Each guide covers LGBTQ+ legal rights, social acceptance, racial experience, safety, healthcare, cost of living and visa options, with sources.</p>
<a class="cta" href="/">Rank these countries for your profile</a>
${sections}`;

  write('countries/index.html', page({
    title: `LGBTQ+ country guides: ${COUNTRIES.length} countries compared | ThriveMap`,
    description: `Guides to ${COUNTRIES.length} countries for LGBTQ+ people and people of colour considering relocation: legal rights, social acceptance, safety, healthcare, cost and visas.`,
    path: '/countries/',
    body,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'ThriveMap country guides',
        url: `${SITE}/countries/`,
        isPartOf: { '@id': `${SITE}/#website` },
      },
      breadcrumbs([['Home', '/'], ['Countries', '/countries/']]),
    ],
  }));
}

// ── Methodology page ─────────────────────────────────────────────────────────

function methodologyPage() {
  const body = `
<h1>How ThriveMap scores countries</h1>
<p class="lead">Every country gets a 0–100 score per dimension, weighted by your priorities into a personal match score. Here is exactly what is measured and where the data comes from.</p>

<h2>The nine dimensions</h2>
<table>
<tr><th>Dimension</th><th>What it measures</th><th>Primary sources</th></tr>
<tr><td>Climate</td><td>How well the typical climate matches your temperature and sunshine preferences</td><td>National met offices</td></tr>
<tr><td>LGBTQ+ legal: orientation</td><td>Same-sex partnerships, marriage, adoption, anti-discrimination law</td><td><a href="https://www.equaldex.com">Equaldex</a>, <a href="https://rainbowmap.ilga-europe.org">ILGA-Europe Rainbow Map</a></td></tr>
<tr><td>LGBTQ+ legal: gender identity</td><td>Legal gender recognition, trans healthcare access, non-binary recognition</td><td><a href="https://ilga.org">ILGA World</a>, <a href="https://tgeu.org">TGEU</a></td></tr>
<tr><td>LGBTQ+ social acceptance</td><td>How accepted LGBTQ+ people are in daily life; public attitude surveys</td><td><a href="https://www.equaldex.com">Equaldex</a>, Pew Research</td></tr>
<tr><td>Racial experience</td><td>Reported social comfort and safety for your racial background</td><td>US State Dept. Human Rights Reports, ECRI, FRA</td></tr>
<tr><td>Safety</td><td>Political stability, violent crime, militarisation</td><td><a href="https://data.worldbank.org/indicator/PV.EST">World Bank</a>, <a href="https://www.visionofhumanity.org">Global Peace Index</a></td></tr>
<tr><td>Healthcare</td><td>Quality of and access to public healthcare</td><td><a href="https://www.who.int/data/gho">WHO Global Health Observatory</a></td></tr>
<tr><td>Cost / value</td><td>Quality of life relative to cost of living</td><td>Numbeo, Expatistan</td></tr>
<tr><td>Visa / residency</td><td>Ease of legally relocating; digital nomad and residency options</td><td>Visaguide.world, official immigration portals</td></tr>
</table>

<h2>How scores stay up to date</h2>
<p>Scores are never just a static snapshot. Three APIs are called live on every visit to the app:</p>
<ul>
<li><strong><a href="https://www.equaldex.com">Equaldex</a></strong>: LGBTQ+ legal rights and social acceptance for all countries, updated continuously as laws change.</li>
<li><strong><a href="https://www.who.int/data/gho">WHO Global Health Observatory</a></strong>: UHC Service Coverage Index, updated annually.</li>
<li><strong><a href="https://data.worldbank.org/indicator/PV.EST">World Bank</a></strong>: Political Stability and Absence of Violence index, updated annually.</li>
</ul>
<p>On top of that, automated weekly and yearly jobs refresh the built-in dataset from Equaldex, the Global Peace Index, the ILGA-Europe Rainbow Map and WHO data. If a live call fails, the app falls back to the built-in dataset and shows which source you are looking at.</p>

<h2>Personalisation</h2>
<p>You build a profile for one or two people (gender identity, sexual orientation, racial background) and set importance sliders per dimension. Defaults are suggested from your profile. A lesbian couple of colour gets higher default weights on LGBTQ+ and racial dimensions. The weighted result ranks all ${COUNTRIES.length} countries from best to worst fit for <em>you</em>.</p>

<h2>Privacy</h2>
<p>Everything is computed in your browser. Nothing is saved: your profile and preferences are never stored or sent anywhere. There is no account, no tracking, and the code is <a href="https://github.com/Kimmymore/Thrivemap">open source</a>.</p>

<h2>Limitations</h2>
<p>Scores are generalisations built on aggregate research. They cannot capture every region, city or individual experience within a country. Racial experience scores in particular reflect reported group-level patterns, not predictions about any individual's life. Treat ThriveMap as a well-sourced starting point for your own research.</p>

<a class="cta" href="/">Get your ranking</a>`;

  write('methodology/index.html', page({
    title: 'Methodology: how ThriveMap scores countries | ThriveMap',
    description: 'How ThriveMap scores 77 countries on LGBTQ+ rights, social acceptance, racial experience, safety, healthcare, cost and visas: data sources, update cadence and limitations.',
    path: '/methodology/',
    body,
    jsonLd: [breadcrumbs([['Home', '/'], ['Methodology', '/methodology/']])],
  }));
}

// ── About page ───────────────────────────────────────────────────────────────

function aboutPage() {
  const body = `
<h1>About ThriveMap</h1>
<p class="lead">Find the countries where you can live freely as yourself.</p>

<h2>Why this exists</h2>
<p>With rights and freedoms shifting rapidly across the world, with formerly progressive countries becoming more restrictive and new protections emerging in unexpected places, it can be overwhelming to figure out where you would actually be safe, accepted, and able to build a life.</p>
<p>ThriveMap was built by a lesbian mixed-race couple navigating exactly this question. It grew out of personal research and a desire to make that research useful for others facing the same challenges.</p>
<p>It is not a travel guide, but a starting point for people who need to ask: <em>where could we go?</em></p>

<h2>What it is</h2>
<p>A free, open-source web tool that ranks ${COUNTRIES.length} countries (every country where same-sex relations are legal) across nine dimensions of livability, personalised to your identity and priorities. See the <a href="/methodology/">methodology</a> for exactly how scoring works, or browse the <a href="/countries/">country guides</a>.</p>

<h2>Privacy first</h2>
<p>Nothing is saved. Your profile never leaves your browser, and nothing is stored or sent anywhere. No account, no cookies, no tracking.</p>

<h2>Open source</h2>
<p>The full source code and dataset are on <a href="https://github.com/Kimmymore/Thrivemap">GitHub</a>. Corrections and contributions are welcome, especially from people with lived experience in the countries covered.</p>

<a class="cta" href="/">Start exploring</a>`;

  write('about/index.html', page({
    title: 'About ThriveMap: why it exists and who built it',
    description: 'ThriveMap is a free, open-source tool built by a lesbian mixed-race couple to help LGBTQ+ people and people of colour find countries where they can live freely.',
    path: '/about/',
    body,
    jsonLd: [breadcrumbs([['Home', '/'], ['About', '/about/']])],
  }));
}

// ── sitemap.xml ──────────────────────────────────────────────────────────────

function sitemap(countryPaths) {
  const urls = [
    { loc: '/', priority: '1.0' },
    { loc: '/countries/', priority: '0.9' },
    { loc: '/methodology/', priority: '0.8' },
    { loc: '/about/', priority: '0.7' },
    ...countryPaths.map((p) => ({ loc: p, priority: '0.8' })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u.loc}</loc><lastmod>${BUILD_DATE}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
  writeFileSync(join(DIST, 'sitemap.xml'), xml);
}

// ── llms.txt ─────────────────────────────────────────────────────────────────

function llmsTxt(entries) {
  const countryLines = COUNTRIES.map((c) =>
    `- [${c.name}](${SITE}/countries/${slugify(c.name)}/): Equaldex Equality Index ${c.ei}/100, region ${c.region}`
  ).join('\n');

  const txt = `# ThriveMap

> ThriveMap (https://www.thrivemap.app) is a free, open-source web tool that helps LGBTQ+ people and people of colour find countries where they can live safely and thrive. It ranks ${COUNTRIES.length} countries (every country where same-sex relations are legal) across nine dimensions: LGBTQ+ legal rights (sexual orientation and gender identity), LGBTQ+ social acceptance, racial experience, safety, healthcare, cost of living, visa/residency options and climate. Rankings are personalised to the user's identity and priorities, computed entirely in the browser with no account and no tracking.

Data sources include Equaldex, ILGA World, ILGA-Europe Rainbow Map, TGEU, WHO Global Health Observatory, World Bank Worldwide Governance Indicators, Global Peace Index, US State Department Human Rights Reports, Numbeo and national immigration portals. LGBTQ+ scores refresh live from the Equaldex API; WHO and World Bank data refresh live on each visit; the built-in dataset is refreshed by automated weekly and yearly jobs.

ThriveMap was built by a lesbian mixed-race couple as a starting point for anyone asking "where could we go?". Scores are well-sourced generalisations, not guarantees. Users should verify current conditions before relocating.

## Key pages

- [Interactive app](${SITE}/): build a profile, set priorities, get a personalised ranking of all ${COUNTRIES.length} countries
- [Country guides index](${SITE}/countries/): all countries with per-country detail pages
- [Methodology](${SITE}/methodology/): scoring dimensions, data sources, update cadence, limitations
- [About](${SITE}/about/): why ThriveMap exists
- [Source code](https://github.com/Kimmymore/Thrivemap): MIT-style open source on GitHub

## Country guides

Each guide covers LGBTQ+ legal rights, social acceptance, racial experience by background, safety, healthcare, cost/value, visa options and climate, with per-dimension explanations and authoritative sources.

${countryLines}
`;
  writeFileSync(join(DIST, 'llms.txt'), txt);
}

// ── Run ──────────────────────────────────────────────────────────────────────

const entries = COUNTRIES.map(countryPage);
countriesIndex(entries);
methodologyPage();
aboutPage();
sitemap(entries.map((e) => e.path));
llmsTxt(entries);

console.log(`Generated ${entries.length} country pages + countries index, about, methodology, sitemap.xml, llms.txt`);
