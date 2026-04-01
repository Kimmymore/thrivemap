import { useState } from 'react';
import { DIMENSIONS } from '../data/scoring';
import { RACIAL_GROUPS, ORIENTATION_OPTIONS, GENDER_OPTIONS } from '../data/countries';
import { getDetail, getSources } from '../data/countryDetails';
import { TEMP_MIN_OFF, TEMP_MAX_OFF } from '../App';

function scoreColor(val) {
  if (val >= 75) return 'score-great';
  if (val >= 55) return 'score-good';
  if (val >= 35) return 'score-fair';
  return 'score-low';
}

function ScoreBar({ value }) {
  return (
    <div className="score-bar-wrap">
      <div className="score-bar-bg">
        <div
          className={`score-bar-fill ${scoreColor(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`score-num ${scoreColor(value)}`}>{value}</span>
    </div>
  );
}

function DimDetail({ countryCode, dimension, score }) {
  const text = getDetail(countryCode, dimension, score);
  const sources = getSources(countryCode, dimension);
  return (
    <div className="dim-detail-panel">
      <p className="dim-detail-text">{text}</p>
      {sources.length > 0 && (
        <div className="dim-sources">
          <span className="dim-sources-label">Sources &amp; further reading:</span>
          <ul className="dim-sources-list">
            {sources.map(s => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer">{s.label} ↗</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CountryRow({ country, rank, expanded, onToggle, excluded, exclusionReason }) {
  const [expandedDim, setExpandedDim] = useState(null);
  const dims = DIMENSIONS.filter(d => country.breakdown[d.key] !== undefined);

  const toggleDim = (key) => {
    setExpandedDim(prev => prev === key ? null : key);
  };

  return (
    <div className={`country-row ${!excluded && rank <= 3 ? 'top-ranked' : ''} ${excluded ? 'country-row-excluded' : ''}`}>
      <div className="country-main" onClick={onToggle} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onToggle()}
        aria-expanded={expanded}
      >
        <div className="country-rank">
          {!excluded && rank <= 3
            ? ['🥇', '🥈', '🥉'][rank - 1]
            : <span className="rank-num">{rank}</span>
          }
        </div>

        <div className="country-identity">
          <span className="country-flag">{country.flag}</span>
          <div>
            <div className="country-name">{country.name}</div>
            <div className="country-region">{country.region}</div>
          </div>
        </div>

        <div className="country-score-col">
          <ScoreBar value={country.total} />
        </div>

        <div className="country-mini-scores">
          {dims.slice(0, 5).map(d => (
            <div key={d.key} className="mini-score" title={d.label}>
              <span className="mini-score-label">{d.label.split(':')[0].trim().slice(0, 6)}</span>
              <span className={`mini-score-val ${scoreColor(country.breakdown[d.key])}`}>
                {Math.round(country.breakdown[d.key])}
              </span>
            </div>
          ))}
        </div>

        <button className="expand-btn" aria-label={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {expanded && (
        <div className="country-detail">
          {exclusionReason && (
            <div className="exclusion-reason">
              🌡️ {exclusionReason}
            </div>
          )}
          {country.note && (
            <div className="country-note">ℹ️ {country.note}</div>
          )}

          <p className="dim-click-hint">Click any score card to read country-specific detail and sources.</p>

          <div className="detail-grid">
            {dims.map(d => {
              const isOpen = expandedDim === d.key;
              return (
                <div
                  key={d.key}
                  className={`detail-row clickable-dim ${isOpen ? 'dim-open' : ''}`}
                  onClick={() => toggleDim(d.key)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && toggleDim(d.key)}
                  aria-expanded={isOpen}
                >
                  <div className="detail-label-row">
                    <span className="detail-label">{d.label}</span>
                    <span className="dim-chevron" aria-hidden="true">{isOpen ? '▲' : '▼'}</span>
                  </div>
                  <ScoreBar value={Math.round(country.breakdown[d.key])} />
                  <p className="detail-desc">{d.description}</p>
                  {isOpen && (
                    <DimDetail
                      countryCode={country.code}
                      dimension={d.key}
                      score={Math.round(country.breakdown[d.key])}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="detail-climate">
            <span>🌡️ Avg temp: <strong>{country.avg_temp_c}°C</strong></span>
            <span>❄️ Coldest month: <strong>{country.temp_winter}°C</strong></span>
            <span>🔆 Hottest month: <strong>{country.temp_summer}°C</strong></span>
            <span>☀️ Avg sun: <strong>{country.sun_hours}h/day</strong></span>
          </div>

          {country.climate_region_note && (
            <div className="climate-region-note">
              🗺️ {country.climate_region_note}
            </div>
          )}

          <a
            className="equaldex-link"
            href={`https://equaldex.com/region/${country.code.toLowerCase()}`}
            target="_blank"
            rel="noreferrer"
          >
            View full LGBTQ+ rights on Equaldex ↗
          </a>
        </div>
      )}
    </div>
  );
}

function personSummary(person) {
  const gender = GENDER_OPTIONS.find(o => o.value === person.gender)?.label || person.gender;
  const orient = ORIENTATION_OPTIONS.find(o => o.value === person.orientation)?.label || person.orientation;
  const race = RACIAL_GROUPS[person.race] || person.race;
  return `${gender} · ${orient} · ${race}`;
}

function getExclusionReason(country, tempMin, tempMax) {
  const reasons = [];
  if (tempMin !== TEMP_MIN_OFF && country.temp_winter < tempMin) {
    reasons.push(`coldest month (${country.temp_winter}°C) is below your minimum of ${tempMin}°C`);
  }
  if (tempMax !== TEMP_MAX_OFF && country.temp_summer > tempMax) {
    reasons.push(`hottest month (${country.temp_summer}°C) exceeds your maximum of ${tempMax}°C`);
  }
  if (reasons.length === 0) return null;
  return `Outside temperature range: ${reasons.join(' and ')}.${country.climate_region_note ? ' See regional note below.' : ''}`;
}

export default function Results({ scored, persons, weights, tempMin, tempMax, equaldexDateLabel, safetyStatus, onBack, onReset }) {
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('');
  const [showLegend, setShowLegend] = useState(false);

  const toggle = (code) => setExpanded(prev => prev === code ? null : code);

  const hasFilter = tempMin !== TEMP_MIN_OFF || tempMax !== TEMP_MAX_OFF;

  // Split into passing and excluded
  const passing = scored.filter(c => {
    const minOk = tempMin === TEMP_MIN_OFF || c.temp_winter >= tempMin;
    const maxOk = tempMax === TEMP_MAX_OFF || c.temp_summer <= tempMax;
    return minOk && maxOk;
  });

  const excluded = scored.filter(c => {
    const minOk = tempMin === TEMP_MIN_OFF || c.temp_winter >= tempMin;
    const maxOk = tempMax === TEMP_MAX_OFF || c.temp_summer <= tempMax;
    return !(minOk && maxOk);
  });

  // Apply text search to each list
  const matchSearch = c =>
    !filter ||
    c.name.toLowerCase().includes(filter.toLowerCase()) ||
    c.region.toLowerCase().includes(filter.toLowerCase());

  const filteredPassing = passing.filter(matchSearch);
  const filteredExcluded = excluded.filter(matchSearch);

  const top3 = passing.slice(0, 3);

  return (
    <div className="step-container results-container">
      <div className="results-hero">
        <h2 className="step-title">Your ThriveMap results</h2>
        <div className="profile-summary">
          {persons.map((p, i) => (
            <span key={i} className="profile-chip">{personSummary(p)}</span>
          ))}
        </div>
      </div>

      {top3.length > 0 && (
        <div className="top3-grid">
          {top3.map((c, i) => (
            <div key={c.code} className="top3-card" onClick={() => toggle(c.code)} role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && toggle(c.code)}>
              <div className="top3-medal">{['🥇', '🥈', '🥉'][i]}</div>
              <div className="top3-flag">{c.flag}</div>
              <div className="top3-name">{c.name}</div>
              <div className={`top3-score ${scoreColor(c.total)}`}>{c.total}<span>/100</span></div>
            </div>
          ))}
        </div>
      )}

      <div className="results-controls">
        <input
          type="search"
          className="search-input"
          placeholder="Search country or region…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          aria-label="Filter countries"
        />
        <button
          className="legend-toggle"
          onClick={() => setShowLegend(v => !v)}
        >
          {showLegend ? 'Hide legend' : 'Score legend'}
        </button>
      </div>

      {showLegend && (
        <div className="legend-box">
          <div className="legend-row">
            <span className="legend-swatch score-great">75–100</span>
            <span>Excellent — strong fit</span>
          </div>
          <div className="legend-row">
            <span className="legend-swatch score-good">55–74</span>
            <span>Good — generally positive</span>
          </div>
          <div className="legend-row">
            <span className="legend-swatch score-fair">35–54</span>
            <span>Mixed — notable concerns</span>
          </div>
          <div className="legend-row">
            <span className="legend-swatch score-low">0–34</span>
            <span>Poor — significant challenges</span>
          </div>
          <p className="legend-note">
            Scores reflect averages and published indices. Individual experiences vary.
            {' '}LGBTQ+ from <a href="https://equaldex.com" target="_blank" rel="noreferrer">Equaldex</a>
            {equaldexDateLabel ? ` (updated ${equaldexDateLabel})` : ''}.
            {' '}Healthcare from <a href="https://www.who.int/data/gho" target="_blank" rel="noreferrer">WHO GHO</a>
            {' (annual)'}.
            {' '}Safety from <a href="https://data.worldbank.org/indicator/PV.EST" target="_blank" rel="noreferrer">World Bank</a>
            {safetyStatus === 'ok' ? ' (live)' : ' (built-in)'}.
          </p>
          <div className="legend-dimensions">
            {DIMENSIONS.map(d => (
              <div key={d.key} className="legend-dim">
                <strong>{d.label}</strong> — {d.description}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Matching countries */}
      <div className="country-list" role="list">
        {filteredPassing.map((c) => (
          <CountryRow
            key={c.code}
            country={c}
            rank={passing.indexOf(c) + 1}
            expanded={expanded === c.code}
            onToggle={() => toggle(c.code)}
            excluded={false}
          />
        ))}
        {filteredPassing.length === 0 && passing.length > 0 && (
          <p className="no-results">No matching countries for your search.</p>
        )}
        {passing.length === 0 && hasFilter && (
          <p className="no-results">No countries match your temperature filters. Try widening the range.</p>
        )}
        {!filter && !hasFilter && filteredPassing.length === 0 && (
          <p className="no-results">No results to show.</p>
        )}
      </div>

      {/* Excluded countries */}
      {hasFilter && excluded.length > 0 && (
        <div className="excluded-section">
          <div className="excluded-header">
            <span className="excluded-header-icon">🌡️</span>
            <div>
              <h3 className="excluded-title">Outside your temperature range</h3>
              <p className="excluded-subtitle">
                {excluded.length} {excluded.length === 1 ? 'country' : 'countries'} — sorted by score, but filtered out based on your climate limits.
                Expand any to see why and read about regional climate options.
              </p>
            </div>
          </div>
          <div className="country-list" role="list">
            {filteredExcluded.map((c, i) => (
              <CountryRow
                key={c.code}
                country={c}
                rank={i + 1}
                expanded={expanded === c.code}
                onToggle={() => toggle(c.code)}
                excluded={true}
                exclusionReason={getExclusionReason(c, tempMin, tempMax)}
              />
            ))}
            {filteredExcluded.length === 0 && (
              <p className="no-results">No excluded countries match your search.</p>
            )}
          </div>
        </div>
      )}

      <div className="step-actions">
        <button className="btn-secondary" onClick={onBack}>← Adjust preferences</button>
        <button className="btn-ghost" onClick={onReset}>Start over</button>
      </div>

      <div className="results-disclaimer">
        <p>
          <strong>Important:</strong> Scores are compiled from publicly available indices (Equaldex,
          Global Peace Index, WHO, Rainbow Europe, ILGA World, Numbeo) and are generalisations.
          Temperature data represents monthly averages for representative regions — individual
          microclimates vary. Racial experience scores reflect aggregate reported experiences and do
          not predict any individual's life. Laws and social attitudes change — always verify current
          conditions before making relocation decisions.
        </p>
      </div>
    </div>
  );
}
