#!/usr/bin/env python3
"""
ThriveMap — weekly Equaldex LGBTQ+ data updater
================================================
Fetches fresh LGBTQ+ Equality Index scores from Equaldex for all tracked
countries and writes them into the equaldex key in external-scores.json,
leaving all other keys (gpi, rainbow, healthcare) untouched.

Run manually:  EQUALDEX_API_KEY=yourkey python3 scripts/update_equaldex.py
Run in CI:     called by .github/workflows/update-equaldex.yml every Monday
               at 03:00 CET (02:00 UTC)

Dependencies: pip install requests   (no other packages needed)
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests

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

# All ISO 3166-1 alpha-2 codes tracked by ThriveMap (must match ISO2_TO_ISO3 in scoring.js)
COUNTRY_CODES = sorted([
    "IS", "NO", "SE", "FI", "DK", "EE", "LV", "LT",
    "NL", "BE", "DE", "AT", "CH", "LU", "FR", "IE", "GB",
    "PT", "ES", "IT", "GR", "MT", "CY", "AD", "SM",
    "CZ", "SI", "SK", "PL", "HU", "RO", "BG", "RS", "HR", "AL",
    "ME", "MK", "UA",
    "CA", "US", "MX", "CR", "CU", "BB", "BZ",
    "AR", "UY", "CL", "BR", "CO", "EC", "PE", "BO", "SR",
    "AU", "NZ", "FJ",
    "JP", "KR", "TW", "CN",
    "TH", "VN", "PH", "KH", "SG", "LA",
    "IN", "NP", "IL",
    "ZA", "BW", "NA", "CV", "SC", "MZ", "AO",
])


def fetch_equaldex(api_key: str) -> dict:
    """
    Calls GET /api/region?apiKey=...&regionid=CODE for each country and returns
    { iso2: { ei, lgbtq_orient, lgbtq_social } } for successful responses.
    Individual country failures are logged and skipped.

    API reference: https://equaldex.stoplight.io/docs/equaldex/f3f4363c924a0-get-lgtbq-rights-by-region-id
    regionid must be an uppercase ISO 3166-1 alpha-2 code (case-sensitive).
    """
    BASE_URL = "https://www.equaldex.com/api/region"
    result = {}
    for code in COUNTRY_CODES:
        params = {"apiKey": api_key, "regionid": code}  # code is already uppercase
        try:
            resp = requests.get(BASE_URL, params=params, headers=HEADERS, timeout=15)
            if resp.status_code == 200:
                data   = resp.json()
                # Response shape: {"regions": {"region": {...}}}
                region = data.get("regions", {}).get("region", {})
                if not region:
                    log.warning("  %s → unexpected response shape: %s", code, data)
                    continue
                ei           = region.get("ei")
                lgbtq_orient = region.get("ei_legal")
                lgbtq_social = region.get("ei_po")
                if any(v is not None for v in [ei, lgbtq_orient, lgbtq_social]):
                    result[code] = {
                        "ei":           ei,
                        "lgbtq_orient": lgbtq_orient,
                        "lgbtq_social": lgbtq_social,
                    }
                    log.info("  %s — ei=%s  legal=%s  po=%s", code, ei, lgbtq_orient, lgbtq_social)
            else:
                log.warning("  %s → HTTP %d", code, resp.status_code)
        except requests.RequestException as e:
            log.warning("  %s → %s", code, e)

    log.info("Fetched %d / %d countries", len(result), len(COUNTRY_CODES))
    return result


def main():
    api_key = os.environ.get("EQUALDEX_API_KEY", "")
    if not api_key:
        log.error("EQUALDEX_API_KEY environment variable is not set. Exiting.")
        sys.exit(1)

    log.info("=== ThriveMap Equaldex weekly updater ===")
    log.info("Fetching data for %d countries...", len(COUNTRY_CODES))
    equaldex = fetch_equaldex(api_key)

    if not equaldex:
        log.error("No data returned from Equaldex — API may still be down. Exiting without writing.")
        sys.exit(1)

    # Load existing file and update only the equaldex key
    if OUT_PATH.exists():
        with open(OUT_PATH) as f:
            scores = json.load(f)
    else:
        scores = {}

    scores["equaldex"] = equaldex
    scores.setdefault("_meta", {}).update({
        "equaldex_count":   len(equaldex),
        "equaldex_updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    })

    OUT_PATH.write_text(json.dumps(scores, indent=2, ensure_ascii=False) + "\n")
    log.info("Written to %s", OUT_PATH)


if __name__ == "__main__":
    main()
