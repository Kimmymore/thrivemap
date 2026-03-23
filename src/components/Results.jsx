import { useState } from 'react';
import { DIMENSIONS } from '../data/scoring';
import { RACIAL_GROUPS, ORIENTATION_OPTIONS, GENDER_OPTIONS } from '../data/countries';
import { getDetail, getSources } from '../data/countryDetails';

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

function CountryRow({ country, rank, persons, expanded, onToggle }) {
  const [expandedDim, setExpandedDim] = useState(null);
  const dims = DIMENSIONS.filter(d => country.breakdown[d.key] !== undefined);

  const toggleDim = (key) => {
    setExpandedDim(prev => prev === key ? null : key);
  };

  return (
    <div className={`country-row ${rank <= 3 ? 'top-ranked' : ''}`}>
      <div className="country-main" onClick={onToggle} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onToggle()}
        aria-expanded={expanded}
      >
        <div className="country-rank">
          {rank <= 3
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
            <span>☀️ Avg sun: <strong>{country.sun_hours}h/day</strong></span>
          </div>

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

export default function Results({ scored, persons, weights, equaldexStatus, healthcareStatus, safetyStatus, onBack, onReset }) {
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('');
  const [showLegend, setShowLegend] = useState(false);

  const toggle = (code) => setExpanded(prev => prev === code ? null : code);

  const filtered = scored.filter(c =>
    !filter || c.name.toLowerCase().includes(filter.toLowerCase()) ||
    c.region.toLowerCase().includes(filter.toLowerCase())
  );

  const top3 = scored.slice(0, 3);

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
            {equaldexStatus === 'ok' ? ' (live)' : ' (built-in)'}.
            {' '}Healthcare from <a href="https://www.who.int/data/gho" target="_blank" rel="noreferrer">WHO GHO</a>
            {healthcareStatus === 'ok' ? ' (live)' : ' (built-in)'}.
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

      <div className="country-list" role="list">
        {filtered.map((c) => (
          <CountryRow
            key={c.code}
            country={c}
            rank={scored.indexOf(c) + 1}
            persons={persons}
            expanded={expanded === c.code}
            onToggle={() => toggle(c.code)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="no-results">No countries match your search.</p>
        )}
      </div>

      <div className="step-actions">
        <button className="btn-secondary" onClick={onBack}>← Adjust preferences</button>
        <button className="btn-ghost" onClick={onReset}>Start over</button>
      </div>

      <div className="results-disclaimer">
        <p>
          <strong>Important:</strong> Scores are compiled from publicly available indices (Equaldex,
          Global Peace Index, WHO, Rainbow Europe, ILGA World, Numbeo) and are generalisations.
          Racial experience scores reflect aggregate reported experiences and do not predict any
          individual's life. Laws and social attitudes change — always verify current conditions
          before making relocation decisions.
        </p>
      </div>
    </div>
  );
}
