import { useState, useEffect, useCallback } from 'react';
import ProfileSetup from './components/ProfileSetup';
import Preferences from './components/Preferences';
import Results from './components/Results';
import { COUNTRIES } from './data/countries';
import {
  fetchWorldBankSafety,
  mergeSafetyData,
  mergeExternalScores,
  equaldexAnnualAvailable,
  scoreCountry,
  suggestWeights,
  DEFAULT_WEIGHTS,
} from './data/scoring';

// Derived synchronously from the bundled JSON — no browser-side API call needed.
const equaldexStatus = equaldexAnnualAvailable ? 'ok' : 'error';
import './App.css';

const STEPS = ['profile', 'preferences', 'results'];

export default function App() {
  const [step, setStep] = useState('profile');

  const [persons, setPersons] = useState([
    { gender: '', orientation: '', race: '' },
  ]);

  const [maxStep, setMaxStep] = useState(0);

  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [tempPref, setTempPref] = useState(50);

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
          <div className="logo">
            <span className="logo-icon">🌈</span>
            <span className="logo-text">ThriveMap</span>
          </div>
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
            onWeightChange={handleWeightChange}
            onTempChange={handleTempChange}
            onNext={handlePreferencesNext}
            onBack={() => setStep('profile')}
          />
        )}
        {step === 'results' && (
          <Results
            scored={scored}
            persons={persons}
            weights={weights}
            equaldexStatus={equaldexStatus}
            safetyStatus={safetyStatus}
            onBack={() => setStep('preferences')}
            onReset={() => {
              setStep('profile');
              setMaxStep(0);
              setPersons([{ gender: '', orientation: '', race: '' }]);
              setWeights(DEFAULT_WEIGHTS);
              setTempPref(50);
            }}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>
          LGBTQ+: <a href="https://equaldex.com" target="_blank" rel="noreferrer">Equaldex</a>
          {equaldexStatus === 'ok' && <span className="badge live">● live</span>}
          {equaldexStatus === 'error' && <span className="badge cached">● built-in</span>}
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
