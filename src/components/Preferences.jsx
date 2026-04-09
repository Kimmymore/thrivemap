import { DIMENSIONS } from '../data/scoring';
import { TEMP_MIN_OFF, TEMP_MAX_OFF } from '../App';

const TEMP_LABELS = ['❄️ Very cold', 'Cold', 'Mild / temperate', 'Warm', '☀️ Tropical hot'];

function tempLabel(val) {
  const idx = Math.round((val / 100) * (TEMP_LABELS.length - 1));
  return TEMP_LABELS[Math.min(idx, TEMP_LABELS.length - 1)];
}

function WeightSlider({ dim, value, onChange }) {
  const pct = Math.round(value);
  return (
    <div className="pref-row">
      <div className="pref-row-header">
        <span className="pref-label">{dim.label}</span>
        <span className={`pref-value ${value < 20 ? 'low' : value >= 70 ? 'high' : ''}`}>
          {value < 20 ? 'Off' : value < 40 ? 'Low' : value < 65 ? 'Medium' : 'High'}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={`${dim.label} importance`}
        className="pref-slider"
        style={{ '--pct': `${pct}%` }}
      />
      <p className="pref-desc">{dim.description}</p>
    </div>
  );
}

function TempFilterSlider({ label, value, min, max, step, offValue, offLabel, valueLabel, onChange, desc }) {
  const isOff = value === offValue;
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="pref-row">
      <div className="pref-row-header">
        <span className="pref-label">{label}</span>
        <span className={`pref-value ${isOff ? 'low' : 'high'}`}>
          {isOff ? offLabel : valueLabel(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
        className="pref-slider temp-filter-slider"
        style={{ '--pct': `${pct}%` }}
      />
      <p className="pref-desc">{isOff ? desc.off : desc.on(value)}</p>
    </div>
  );
}

export default function Preferences({
  weights, tempPref, tempMin, tempMax,
  onWeightChange, onTempChange, onTempMinChange, onTempMaxChange,
  onNext, onBack,
}) {
  const otherDimensions = DIMENSIONS.filter(d => d.key !== 'climate');

  return (
    <div className="step-container">
      <div className="step-hero">
        <h2 className="step-title">What matters most to you?</h2>
        <p className="step-subtitle">
          We've pre-filled smart defaults based on your profile. Adjust the sliders
          to match your priorities — then see your personalised country ranking.
        </p>
      </div>

      <div className="pref-section pref-section-how-to">
        <p className="pref-section-note">
          Move each slider to reflect how important this dimension is to you.
          <strong> Off</strong> = ignore this,&nbsp;
          <strong>High</strong> = this is a deciding factor.
        </p>
      </div>

      <div className="pref-section">
        <h3 className="pref-section-title">🌡️ Climate preferences</h3>

        <div className="pref-row">
          <div className="pref-row-header">
            <span className="pref-label">Temperature preference</span>
            <span className="pref-value">{tempLabel(tempPref)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={tempPref}
            onChange={e => onTempChange(Number(e.target.value))}
            aria-label="Temperature preference"
            className="pref-slider temp-slider"
            style={{ '--pct': `${tempPref}%` }}
          />
          <div className="temp-scale-labels">
            <span>❄️ Arctic cold</span>
            <span>Tropical hot ☀️</span>
          </div>
          <p className="pref-desc">
            Slide towards your ideal climate — from icy Scandinavia to year-round tropical warmth.
          </p>
        </div>

        <TempFilterSlider
          label="Minimum temperature"
          value={tempMin}
          min={TEMP_MIN_OFF}
          max={35}
          step={1}
          offValue={TEMP_MIN_OFF}
          offLabel="No minimum"
          valueLabel={v => `≥ ${v}°C`}
          onChange={onTempMinChange}
          desc={{
            off: 'No cold-weather limit applied. Slide right to exclude countries with cold winters.',
            on: v => `In the warmest region, the coldest month must average at least ${v}°C. Countries that don't qualify are shown separately below your results.`,
          }}
        />

        <TempFilterSlider
          label="Maximum temperature"
          value={tempMax}
          min={15}
          max={TEMP_MAX_OFF}
          step={1}
          offValue={TEMP_MAX_OFF}
          offLabel="No maximum"
          valueLabel={v => `≤ ${v}°C`}
          onChange={onTempMaxChange}
          desc={{
            off: 'No heat limit applied. Slide left to exclude countries with hot summers.',
            on: v => `In the coolest region, the hottest month must average no more than ${v}°C. Countries that don't qualify are shown separately below your results.`,
          }}
        />

        <div className="pref-row">
          <div className="pref-row-header">
            <span className="pref-label">Climate — importance</span>
            <span className={`pref-value ${weights.climate < 20 ? 'low' : weights.climate >= 70 ? 'high' : ''}`}>
              {weights.climate < 20 ? 'Off' : weights.climate < 40 ? 'Low' : weights.climate < 65 ? 'Medium' : 'High'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={weights.climate}
            onChange={e => onWeightChange('climate', Number(e.target.value))}
            aria-label="Climate importance"
            className="pref-slider"
            style={{ '--pct': `${weights.climate}%` }}
          />
          <p className="pref-desc">
            How much should climate match affect a country's overall score?
          </p>
        </div>
      </div>

      <div className="pref-section">
        <h3 className="pref-section-title">⚖️ What matters to your happiness?</h3>

        {otherDimensions.map(dim => (
          <WeightSlider
            key={dim.key}
            dim={dim}
            value={weights[dim.key] ?? 50}
            onChange={val => onWeightChange(dim.key, val)}
          />
        ))}
      </div>

      <div className="step-actions">
        <button className="btn-secondary" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={onNext}>
          Show my results →
        </button>
      </div>
    </div>
  );
}
