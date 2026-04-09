import { useState, useEffect, useCallback } from 'react';
import ProfileSetup from './components/ProfileSetup';
import Preferences from './components/Preferences';
import Results from './components/Results';
import { COUNTRIES } from './data/countries';
import {
  fetchWorldBankSafety,
  mergeSafetyData,
  mergeExternalScores,
  equaldexLastUpdated,
  scoreCountry,
  suggestWeights,
  DEFAULT_WEIGHTS,
} from './data/scoring';

// Format as "Jan 2025", or null when Equaldex data has never been fetched.
const equaldexDateLabel = equaldexLastUpdated
  ? new Date(equaldexLastUpdated).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
  : null;
import './App.css';

const STEPS = ['profile', 'preferences', 'results'];

// Sentinel values: -15 = "no minimum", 50 = "no maximum"
export const TEMP_MIN_OFF = -15;
export const TEMP_MAX_OFF = 50;

export default function App() {
  const [step, setStep] = useState('profile');

  const [persons, setPersons] = useState([
    { gender: '', orientation: '', ethnicity: [] },
  ]);

  const [maxStep, setMaxStep] = useState(0);

  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [tempPref, setTempPref] = useState(50);
  const [tempMin, setTempMin] = useState(TEMP_MIN_OFF);
  const [tempMax, setTempMax] = useState(TEMP_MAX_OFF);

  const [countries, setCountries] = useState(COUNTRIES);
  const [safetyStatus, setSafetyStatus] = useState('idle');
  const [scored, setScored] = useState([]);

  useEffect(() => {
    setSafetyStatus('loading');

    // Apply bundled annual data (GPI + Rainbow Map + WHO healthcare + Equaldex) first.
    // These are fetched each July by the GitHub Actions workflow and baked into the build.
    // Equaldex is included here — fetched server-side so the API key never enters the bundle.
    let updated = mergeExternalScores(COUNTRIES);

    fetchWorldBankSafety().then(liveSafety => {
      if (liveSafety) {
        updated = mergeSafetyData(updated, liveSafety);
        setSafetyStatus('ok');
      } else {
        setSafetyStatus('error');
      }
      setCountries(updated);
    });
  }, []);

  const computeScores = useCallback(() => {
    const results = countries.map(c => ({
      ...c,
      ...scoreCountry(c, persons, weights, tempPref),
    }));
    results.sort((a, b) => b.total - a.total);
    setScored(results);
  }, [countries, persons, weights, tempPref]);

  const handleProfileNext = (updatedPersons) => {
    setPersons(updatedPersons);
    setWeights(suggestWeights(updatedPersons));
    setMaxStep(prev => Math.max(prev, 1));
    setStep('preferences');
  };

  const handlePreferencesNext = () => {
    setMaxStep(prev => Math.max(prev, 2));
    setStep('results');
  };

  const handleWeightChange = (key, val) =>
    setWeights(prev => ({ ...prev, [key]: val }));
  const handleTempChange = (val) => setTempPref(val);

  useEffect(() => {
    if (step === 'results') computeScores();
  }, [step, computeScores]);

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <button
            className="logo logo-btn"
            onClick={() => { setStep('profile'); setMaxStep(0); setPersons([{ gender: '', orientation: '', ethnicity: [] }]); setWeights(DEFAULT_WEIGHTS); setTempPref(50); setTempMin(TEMP_MIN_OFF); setTempMax(TEMP_MAX_OFF); }}
            aria-label="Go to homepage"
          >
            <span className="logo-icon">🌈</span>
            <span className="logo-text">ThriveMap</span>
          </button>
          <nav className="step-nav" aria-label="Steps">
            {['Profile', 'Preferences', 'Results'].map((label, i) => (
              <button
                key={label}
                className={`step-btn ${i === stepIndex ? 'active' : ''} ${i < stepIndex ? 'done' : ''}`}
                onClick={() => i !== stepIndex && i <= maxStep && setStep(STEPS[i])}
                disabled={i > maxStep}
                aria-current={i === stepIndex ? 'step' : undefined}
              >
                <span className="step-num">{i < stepIndex ? '✓' : i + 1}</span>
                <span className="step-label">{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main">
        {step === 'profile' && (
          <ProfileSetup persons={persons} onNext={handleProfileNext} />
        )}
        {step === 'preferences' && (
          <Preferences
            weights={weights}
            tempPref={tempPref}
            tempMin={tempMin}
            tempMax={tempMax}
            onWeightChange={handleWeightChange}
            onTempChange={handleTempChange}
            onTempMinChange={setTempMin}
            onTempMaxChange={setTempMax}
            onNext={handlePreferencesNext}
            onBack={() => setStep('profile')}
          />
        )}
        {step === 'results' && (
          <Results
            scored={scored}
            persons={persons}
            weights={weights}
            tempMin={tempMin}
            tempMax={tempMax}
            equaldexDateLabel={equaldexDateLabel}
            safetyStatus={safetyStatus}
            onBack={() => setStep('preferences')}
            onReset={() => {
              setStep('profile');
              setMaxStep(0);
              setPersons([{ gender: '', orientation: '', ethnicity: [] }]);
              setWeights(DEFAULT_WEIGHTS);
              setTempPref(50);
              setTempMin(TEMP_MIN_OFF);
              setTempMax(TEMP_MAX_OFF);
            }}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>
          LGBTQ+: <a href="https://equaldex.com" target="_blank" rel="noreferrer">Equaldex</a>
          {equaldexDateLabel && <span className="badge live">● {equaldexDateLabel}</span>}
          {' · '}Healthcare: <a href="https://www.who.int/data/gho" target="_blank" rel="noreferrer">WHO GHO</a>
          <span className="badge cached">● annual</span>
          {' · '}Safety: <a href="https://data.worldbank.org/indicator/PV.EST" target="_blank" rel="noreferrer">World Bank</a>
          {safetyStatus === 'ok' && <span className="badge live">● live</span>}
          {safetyStatus === 'error' && <span className="badge cached">● built-in</span>}
          {safetyStatus === 'loading' && <span className="badge loading-ind">● updating…</span>}
          {' · '}Scores are generalisations — individual experiences vary.
        </p>
        <p className="footer-love">Made with ❤️ for everyone who deserves a place to thrive.</p>
      </footer>
    </div>
  );
}
