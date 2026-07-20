import { useState, useEffect } from 'react';
import { GENDER_OPTIONS, ORIENTATION_OPTIONS, ETHNICITY_OPTIONS } from '../data/countries';

// "free" leads deliberately: it is the word rendered statically in the
// index.html prerender, the og-image, and whenever reduced motion is requested,
// so it is what crawlers and non-animating visitors actually see.
const HEADLINE_WORDS = ['free', 'open', 'honest', 'relaxed', 'unguarded', 'loud', 'visible', 'respected'];

/**
 * Cycles one word inside the headline.
 *
 * The visible rotation is aria-hidden and paired with a visually hidden static
 * sentence listing every word, so screen readers get one coherent sentence
 * instead of a word that mutates under them. Keying the span on the word itself
 * remounts it, which replays the entry animation.
 */
function RotatingWord({ words, intervalMs = 2200 }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    // Rotation is motion: hold on the first word when reduced motion is requested.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setI(n => (n + 1) % words.length), intervalMs);
    return () => clearInterval(id);
  }, [words.length, intervalMs]);

  return (
    <span className="rotator">
      <span key={words[i]} className="rot-word">{words[i]}</span>
    </span>
  );
}

function PersonCard({ person, index, onChange }) {
  const label = index === 0 ? 'Person 1' : 'Person 2';

  const toggleEthnicity = (value) => {
    const current = person.ethnicity ?? [];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onChange({ ...person, ethnicity: next });
  };

  return (
    <div className="person-card">
      <h3 className="person-title">{label}</h3>

      <div className="field-group">
        <label className="field-label" htmlFor={`gender-${index}`}>Gender</label>
        <select
          id={`gender-${index}`}
          className="field-select"
          value={person.gender}
          onChange={e => onChange({ ...person, gender: e.target.value })}
        >
          <option value="">Select…</option>
          {GENDER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="field-group">
        <label className="field-label" htmlFor={`orient-${index}`}>Sexual preference</label>
        <select
          id={`orient-${index}`}
          className="field-select"
          value={person.orientation}
          onChange={e => onChange({ ...person, orientation: e.target.value })}
        >
          <option value="">Select…</option>
          {ORIENTATION_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="field-group">
        <span className="field-label">Perceived ethnic categories</span>
        <p className="field-hint field-hint-top">
          How are you likely to be perceived by others? This affects racism and colorism risk in different countries.
        </p>
        <div className="ethnicity-checkboxes">
          {ETHNICITY_OPTIONS.map(o => (
            <label key={o.value} className="ethnicity-option">
              <input
                type="checkbox"
                checked={(person.ethnicity ?? []).includes(o.value)}
                onChange={() => toggleEthnicity(o.value)}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProfileSetup({ persons, onNext }) {
  const [localPersons, setLocalPersons] = useState(persons);
  const [error, setError] = useState('');

  const updatePerson = (i, updated) => {
    const next = [...localPersons];
    next[i] = updated;
    setLocalPersons(next);
    setError('');
  };

  const setCount = (n) => {
    if (n === 1) setLocalPersons([localPersons[0]]);
    if (n === 2) setLocalPersons([localPersons[0], localPersons[1] || { gender: '', orientation: '', ethnicity: [] }]);
  };

  const handleNext = () => {
    const incomplete = localPersons.some(p => !p.gender || !p.orientation || !p.ethnicity || p.ethnicity.length === 0);
    if (incomplete) {
      setError('Please fill in all fields for each person, including at least one ethnic category.');
      return;
    }
    onNext(localPersons);
  };

  return (
    <div className="step-container">
      <div className="step-hero">
        <h1 className="step-title">
          <span className="sr-only">
            Live where you can be free, open, honest, relaxed, unguarded, loud,
            visible and respected about who you are.
          </span>
          <span aria-hidden="true">
            Live where you can be <RotatingWord words={HEADLINE_WORDS} /> about who you are.
          </span>
        </h1>
        <p className="step-subtitle">
          77 countries. Nine dimensions. Ranked for you. Nothing is saved: no account,
          no cookies, no tracking. Your answers never leave your browser.
        </p>
      </div>

      <div className="person-count-toggle">
        <span className="toggle-label">I'm searching as:</span>
        <div className="segmented" role="group" aria-label="Number of people">
          <button
            className={`toggle-btn ${localPersons.length === 1 ? 'active' : ''}`}
            onClick={() => setCount(1)}
            aria-pressed={localPersons.length === 1}
          >
            An individual
          </button>
          <button
            className={`toggle-btn ${localPersons.length === 2 ? 'active' : ''}`}
            onClick={() => setCount(2)}
            aria-pressed={localPersons.length === 2}
          >
            A couple
          </button>
        </div>
      </div>

      <div className={`persons-grid ${localPersons.length === 2 ? 'two-up' : ''}`}>
        {localPersons.map((p, i) => (
          <PersonCard
            key={i}
            person={p}
            index={i}
            onChange={updated => updatePerson(i, updated)}
          />
        ))}
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="step-actions">
        <button className="btn-primary" onClick={handleNext}>
          Show me my countries
        </button>
      </div>

      <p className="nothing-saved">
        <strong>Nothing is saved.</strong> Your answers never leave your browser.
        No account, no cookies, no tracking, no data sent to any server.
      </p>
    </div>
  );
}
