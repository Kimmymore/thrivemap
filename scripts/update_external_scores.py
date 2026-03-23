#!/usr/bin/env python3
"""
ThriveMap — annual external scores updater
==========================================
Downloads the Global Peace Index (GPI) and ILGA-Europe Rainbow Map data,
normalises both to the 0–100 scale ThriveMap uses, and writes the result to
  src/data/external-scores.json

Run manually:  python3 scripts/update_external_scores.py
Run in CI:     called by .github/workflows/update-external-scores.yml every July

Dependencies: pip install requests openpyxl pandas beautifulsoup4 lxml
"""

import io
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

import requests
import pandas as pd
from bs4 import BeautifulSoup

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
log = logging.getLogger(__name__)

SCRIPT_DIR = Path(__file__).parent
OUT_PATH   = SCRIPT_DIR.parent / "src" / "data" / "external-scores.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; ThriveMap-DataBot/1.0; "
        "+https://github.com/Kimmymore/Thrivemap)"
    )
}

# ── ISO 3166-1 alpha-3 → alpha-2 mapping for the countries ThriveMap tracks ──
ISO3_TO_ISO2 = {
    "ISL": "IS", "NOR": "NO", "SWE": "SE", "FIN": "FI", "DNK": "DK",
    "EST": "EE", "LVA": "LV", "LTU": "LT",
    "NLD": "NL", "BEL": "BE", "DEU": "DE", "AUT": "AT", "CHE": "CH",
    "LUX": "LU", "FRA": "FR", "IRL": "IE", "GBR": "GB",
    "PRT": "PT", "ESP": "ES", "ITA": "IT", "GRC": "GR", "MLT": "MT",
    "CYP": "CY", "AND": "AD", "SMR": "SM",
    "CZE": "CZ", "SVN": "SI", "SVK": "SK", "POL": "PL", "HUN": "HU",
    "ROU": "RO", "BGR": "BG", "SRB": "RS", "HRV": "HR", "ALB": "AL",
    "MNE": "ME", "MKD": "MK", "UKR": "UA",
    "CAN": "CA", "USA": "US", "MEX": "MX",
    "CRI": "CR", "CUB": "CU", "BRB": "BB", "BLZ": "BZ",
    "ARG": "AR", "URY": "UY", "CHL": "CL", "BRA": "BR", "COL": "CO",
    "ECU": "EC", "PER": "PE", "BOL": "BO", "SUR": "SR",
    "AUS": "AU", "NZL": "NZ", "FJI": "FJ",
    "JPN": "JP", "KOR": "KR", "TWN": "TW", "CHN": "CN",
    "THA": "TH", "VNM": "VN", "PHL": "PH", "KHM": "KH",
    "SGP": "SG", "LAO": "LA",
    "IND": "IN", "NPL": "NP",
    "ISR": "IL",
    "ZAF": "ZA", "BWA": "BW", "NAM": "NA", "CPV": "CV",
    "SYC": "SC", "MOZ": "MZ", "AGO": "AO",
}

# Rainbow Map uses full country names; map the tricky ones explicitly
RAINBOW_NAME_TO_ISO2 = {
    "Albania":         "AL", "Andorra":        "AD", "Austria":        "AT",
    "Belgium":         "BE", "Bosnia":         "BA", "Bulgaria":       "BG",
    "Croatia":         "HR", "Cyprus":         "CY", "Czech Republic":  "CZ",
    "Czechia":         "CZ", "Denmark":        "DK", "Estonia":        "EE",
    "Finland":         "FI", "France":         "FR", "Germany":        "DE",
    "Greece":          "GR", "Hungary":        "HU", "Iceland":        "IS",
    "Ireland":         "IE", "Italy":          "IT", "Kosovo":         "XK",
    "Latvia":          "LV", "Liechtenstein":  "LI", "Lithuania":      "LT",
    "Luxembourg":      "LU", "Malta":          "MT", "Moldova":        "MD",
    "Montenegro":      "ME", "Netherlands":    "NL", "North Macedonia": "MK",
    "Norway":          "NO", "Poland":         "PL", "Portugal":       "PT",
    "Romania":         "RO", "San Marino":     "SM", "Serbia":         "RS",
    "Slovakia":        "SK", "Slovenia":       "SI", "Spain":          "ES",
    "Sweden":          "SE", "Switzerland":    "CH", "Turkey":         "TR",
    "Ukraine":         "UA", "United Kingdom": "GB",
}


# ─────────────────────────────────────────────────────────────────────────────
# 1. Global Peace Index
# ─────────────────────────────────────────────────────────────────────────────

def fetch_gpi() -> dict[str, int] | None:
    """
    Download the GPI Excel file from visionofhumanity.org.
    Returns { iso2: safety_score (0-100) } where higher = more peaceful.

    The Institute for Economics & Peace publishes this each June.
    File URL pattern: /wp-content/uploads/{year}/06/GPI-{year}-overall-scores-...xlsx
    """
    current_year = datetime.now().year
    years_to_try = [current_year, current_year - 1]

    for year in years_to_try:
        # IEP uses two observed filename variants; try both
        candidates = [
            f"https://www.visionofhumanity.org/wp-content/uploads/{year}/06/"
            f"GPI-{year}-overall-scores-and-domains-2008-{year}.xlsx",
            f"https://www.visionofhumanity.org/wp-content/uploads/{year}/06/"
            f"GPI-{year}-web.xlsx",
        ]
        for url in candidates:
            log.info("GPI: trying %s", url)
            try:
                resp = requests.get(url, headers=HEADERS, timeout=30)
                if resp.status_code == 200:
                    log.info("GPI: downloaded %d bytes from %s", len(resp.content), url)
                    return _parse_gpi_excel(resp.content, year)
            except requests.RequestException as e:
                log.warning("GPI: request failed: %s", e)

    log.error("GPI: could not download data for %d or %d", current_year, current_year - 1)
    return None


def _parse_gpi_excel(raw: bytes, year: int) -> dict[str, int]:
    """
    Parse the GPI Excel file.
    The relevant sheet contains columns: iso3 / country name, overall score.
    GPI overall score: lower = more peaceful (1.0 best, ~3.5 worst).
    We invert and normalise to 0–100 (100 = most peaceful).
    """
    xls = pd.ExcelFile(io.BytesIO(raw), engine="openpyxl")
    log.info("GPI: sheets found: %s", xls.sheet_names)

    # Try to find the 'Overall Scores' sheet (name varies slightly by year)
    target = None
    for name in xls.sheet_names:
        if "overall" in name.lower() or "score" in name.lower():
            target = name
            break
    if target is None:
        target = xls.sheet_names[0]

    df = pd.read_excel(xls, sheet_name=target, header=None)
    log.info("GPI sheet '%s': %d rows × %d cols", target, len(df), len(df.columns))

    # Locate the header row (contains 'iso3' or 'iso' or 'country')
    header_row = None
    for i, row in df.iterrows():
        vals = [str(v).lower() for v in row.values if pd.notna(v)]
        if any("iso" in v or "country" in v for v in vals):
            header_row = i
            break

    if header_row is None:
        log.error("GPI: could not locate header row")
        return {}

    df.columns = df.iloc[header_row]
    df = df.iloc[header_row + 1:].reset_index(drop=True)

    # Find ISO3 column and overall score column for the target year
    cols = [str(c).strip() for c in df.columns]
    log.info("GPI columns: %s", cols[:15])

    iso_col   = next((c for c in cols if "iso" in c.lower()), None)
    score_col = next(
        (c for c in cols if str(year) in str(c) or "overall" in c.lower()),
        None,
    )
    if not iso_col or not score_col:
        log.error("GPI: could not find iso or score column. Cols: %s", cols)
        return {}

    result = {}
    for _, row in df.iterrows():
        iso3 = str(row[iso_col]).strip().upper()
        val  = row[score_col]
        if len(iso3) != 3 or not isinstance(val, (int, float)) or pd.isna(val):
            continue
        iso2 = ISO3_TO_ISO2.get(iso3)
        if not iso2:
            continue
        # GPI range is roughly 1.0 (most peaceful) to 3.5 (least peaceful)
        # Invert: score = (3.5 - gpi) / 2.5 * 100, clamped 0–100
        normalised = round(max(0, min(100, (3.5 - float(val)) / 2.5 * 100)))
        result[iso2] = normalised

    log.info("GPI: parsed %d countries", len(result))
    return result


# ─────────────────────────────────────────────────────────────────────────────
# 2. ILGA-Europe Rainbow Map
# ─────────────────────────────────────────────────────────────────────────────

def fetch_rainbow_map() -> dict[str, int] | None:
    """
    Fetch the Rainbow Map index scores from rainbowmap.ilga-europe.org.

    Strategy A: look for a JSON data bundle embedded in the JS app (fastest).
    Strategy B: scrape the view-by-country page for the score table.
    Strategy C: download per-country CSV files for each European country.

    Returns { iso2: rainbow_score (0-100) }.
    """
    result = _rainbow_from_view_page()
    if result:
        return result

    log.info("Rainbow Map: view-page scrape found nothing, trying per-country CSVs")
    return _rainbow_from_country_csvs()


def _rainbow_from_view_page() -> dict[str, int]:
    """
    The 'view by country' page lists all countries with their index scores.
    We look for JSON embedded in <script> tags first, then fall back to HTML.
    """
    url = "https://rainbowmap.ilga-europe.org/view-by-country/"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        if not resp.ok:
            log.warning("Rainbow Map view page: HTTP %d", resp.status_code)
            return {}
    except requests.RequestException as e:
        log.warning("Rainbow Map view page: %s", e)
        return {}

    soup = BeautifulSoup(resp.text, "lxml")

    # Look for a JSON blob in a <script> tag that contains country score data
    for tag in soup.find_all("script"):
        text = tag.string or ""
        if "rainbow" in text.lower() and "score" in text.lower() and "{" in text:
            try:
                start = text.index("{")
                data  = json.loads(text[start:])
                extracted = _extract_scores_from_json(data)
                if extracted:
                    log.info("Rainbow Map: extracted %d scores from inline JSON", len(extracted))
                    return extracted
            except (ValueError, KeyError):
                pass

    # Fallback: parse the HTML table or list
    result = {}
    for row in soup.select("tr, li[data-country], div[data-country]"):
        name_el  = row.select_one("td:first-child, .country-name, [data-name]")
        score_el = row.select_one("td:nth-child(2), .score, [data-score]")
        if not name_el or not score_el:
            continue
        name  = name_el.get_text(strip=True)
        iso2  = RAINBOW_NAME_TO_ISO2.get(name)
        try:
            score = round(float(score_el.get_text(strip=True).replace("%", "")))
            if iso2:
                result[iso2] = score
        except ValueError:
            pass

    log.info("Rainbow Map: HTML scrape found %d scores", len(result))
    return result


def _extract_scores_from_json(data: dict | list, depth: int = 0) -> dict[str, int]:
    """Recursively search a JSON structure for country + score pairs."""
    if depth > 5:
        return {}
    result = {}
    if isinstance(data, list):
        for item in data:
            result.update(_extract_scores_from_json(item, depth + 1))
    elif isinstance(data, dict):
        # Heuristic: object has name + score fields
        name  = data.get("name") or data.get("country") or data.get("title", "")
        score = data.get("score") or data.get("index") or data.get("value")
        iso2  = RAINBOW_NAME_TO_ISO2.get(str(name).strip())
        if iso2 and score is not None:
            try:
                result[iso2] = round(float(score))
            except (ValueError, TypeError):
                pass
        for v in data.values():
            if isinstance(v, (dict, list)):
                result.update(_extract_scores_from_json(v, depth + 1))
    return result


def _rainbow_from_country_csvs() -> dict[str, int]:
    """
    Each country page on rainbowmap.ilga-europe.org has a CSV download.
    We fetch a score for each European country we track.
    Only runs if the view-page scrape failed.
    """
    european_countries = {
        "albania": "AL", "andorra": "AD", "austria": "AT", "belgium": "BE",
        "bulgaria": "BG", "croatia": "HR", "cyprus": "CY", "czechia": "CZ",
        "denmark": "DK", "estonia": "EE", "finland": "FI", "france": "FR",
        "germany": "DE", "greece": "GR", "hungary": "HU", "iceland": "IS",
        "ireland": "IE", "italy": "IT", "latvia": "LV", "lithuania": "LT",
        "luxembourg": "LU", "malta": "MT", "moldova": "MD", "montenegro": "ME",
        "netherlands": "NL", "north-macedonia": "MK", "norway": "NO",
        "poland": "PL", "portugal": "PT", "romania": "RO", "san-marino": "SM",
        "serbia": "RS", "slovakia": "SK", "slovenia": "SI", "spain": "ES",
        "sweden": "SE", "switzerland": "CH", "ukraine": "UA",
        "united-kingdom": "GB",
    }
    result = {}
    base = "https://rainbowmap.ilga-europe.org/countries/{slug}/"

    for slug, iso2 in european_countries.items():
        url = base.format(slug=slug)
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            if not resp.ok:
                continue
            soup = BeautifulSoup(resp.text, "lxml")
            # The overall Rainbow Index % is usually the most prominent score on the page
            for el in soup.select(".overall-score, .index-score, [class*='score']"):
                text = el.get_text(strip=True).replace("%", "")
                try:
                    result[iso2] = round(float(text))
                    break
                except ValueError:
                    pass
        except requests.RequestException:
            pass

    log.info("Rainbow Map (per-country): found %d scores", len(result))
    return result


# ─────────────────────────────────────────────────────────────────────────────
# 3. Write output
# ─────────────────────────────────────────────────────────────────────────────

def main():
    log.info("=== ThriveMap external score updater ===")
    log.info("Fetching Global Peace Index...")
    gpi = fetch_gpi() or {}

    log.info("Fetching ILGA-Europe Rainbow Map...")
    rainbow = fetch_rainbow_map() or {}

    output = {
        "_meta": {
            "generated":   datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "gpi_count":   len(gpi),
            "rainbow_count": len(rainbow),
            "note": (
                "gpi scores are 0–100 (100 = most peaceful), "
                "normalised from raw GPI (1.0–3.5 scale, lower = more peaceful). "
                "rainbow scores are 0–100 Rainbow Index percentage from ILGA-Europe."
            ),
        },
        "gpi":     gpi,
        "rainbow": rainbow,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n")
    log.info("Written to %s", OUT_PATH)
    log.info("GPI: %d countries, Rainbow: %d countries", len(gpi), len(rainbow))

    if not gpi and not rainbow:
        log.error("Both sources returned no data — exiting with error")
        sys.exit(1)


if __name__ == "__main__":
    main()
