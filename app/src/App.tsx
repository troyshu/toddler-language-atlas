import { useMemo, useState } from 'react'
import './App.css'
import { defaultAssets } from './domain/assets'
import { content } from './domain/content'
import { domainCoverage } from './domain/graph'
import { createDemoLearner, makeObservation, promptLevels, recordObservation } from './domain/mastery'
import { recommendNextActivities } from './domain/recommendations'
import { runSimulationSuite } from './domain/simulations'
import { useLocalStorageState } from './domain/storage'
import type { AssetItem, LearnerState, ObservationResult, PromptLevel, Recommendation } from './domain/types'

type ViewMode = 'dashboard' | 'photo-point' | 'put-it-somewhere' | 'simulations'

const storageKey = 'tla.mvp.learner.v1'
const assetStorageKey = 'tla.mvp.assets.v1'

function App() {
  const initialLearner = useMemo(() => createDemoLearner(content), [])
  const [learner, setLearner] = useLocalStorageState<LearnerState>(storageKey, initialLearner)
  const [assets, setAssets] = useLocalStorageState<AssetItem[]>(assetStorageKey, defaultAssets)
  const [view, setView] = useState<ViewMode>('dashboard')
  const recommendations = useMemo(() => recommendNextActivities(content, learner, 6), [learner])
  const simulations = useMemo(() => runSimulationSuite(content), [])
  const coverage = useMemo(() => domainCoverage(content, learner.skill_states), [learner])

  function logObservation(input: {
    skillIds: string[]
    activityId: string
    response: ObservationResult
    promptLevel: PromptLevel
    source: 'app_probe' | 'parent_log' | 'real_world' | 'recheck'
    generalization: boolean
    notes: string
    setting?: string
    material?: string
  }) {
    const observation = makeObservation({
      learnerId: learner.learner_id,
      ...input,
    })
    setLearner(recordObservation(content, learner, observation))
  }

  function resetDemo() {
    setLearner(createDemoLearner(content))
    setAssets(defaultAssets)
    setView('dashboard')
  }

  async function addAsset(file: File) {
    const dataUrl = await fileToDataUrl(file)
    const label = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ').trim() || 'photo'
    setAssets([
      ...assets,
      {
        id: `asset.upload.${Date.now()}`,
        label,
        tags: ['uploaded', 'photo'],
        kind: 'image',
        value: dataUrl,
      },
    ])
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Local-first MVP</p>
          <h1>Toddler Language Atlas</h1>
        </div>
        <nav className="mode-tabs" aria-label="Views">
          <button className={view === 'dashboard' ? 'active' : ''} type="button" onClick={() => setView('dashboard')}>
            Dashboard
          </button>
          <button
            className={view === 'photo-point' ? 'active' : ''}
            type="button"
            onClick={() => setView('photo-point')}
          >
            Photo Point
          </button>
          <button
            className={view === 'put-it-somewhere' ? 'active' : ''}
            type="button"
            onClick={() => setView('put-it-somewhere')}
          >
            Put It
          </button>
          <button
            className={view === 'simulations' ? 'active' : ''}
            type="button"
            onClick={() => setView('simulations')}
          >
            Sims
          </button>
        </nav>
      </header>

      {view === 'dashboard' && (
        <ParentDashboard
          assets={assets}
          coverage={coverage}
          learner={learner}
          recommendations={recommendations}
          onAddAsset={addAsset}
          onLogObservation={logObservation}
          onResetDemo={resetDemo}
          onStartActivity={(activityId) => {
            setView(activityId === 'act.put_it_somewhere.v1' ? 'put-it-somewhere' : 'photo-point')
          }}
        />
      )}

      {view === 'photo-point' && (
        <PhotoPointActivity assets={assets} onBack={() => setView('dashboard')} onLogObservation={logObservation} />
      )}

      {view === 'put-it-somewhere' && (
        <PutItSomewhereActivity onBack={() => setView('dashboard')} onLogObservation={logObservation} />
      )}

      {view === 'simulations' && <SimulationPanel results={simulations} />}
    </main>
  )
}

function ParentDashboard({
  assets,
  coverage,
  learner,
  recommendations,
  onAddAsset,
  onLogObservation,
  onResetDemo,
  onStartActivity,
}: {
  assets: AssetItem[]
  coverage: Array<{ domain: string; total: number; active: number; mastered: number }>
  learner: LearnerState
  recommendations: Recommendation[]
  onAddAsset: (file: File) => void
  onLogObservation: (input: ObservationInput) => void
  onResetDemo: () => void
  onStartActivity: (activityId: string) => void
}) {
  const [selectedSkill, setSelectedSkill] = useState('concept.prepositions.in_on_under.v1')
  const [note, setNote] = useState('')

  return (
    <section className="dashboard-grid">
      <div className="summary-panel">
        <div className="metric-row">
          <Metric label="Skills" value={content.skills.length.toString()} />
          <Metric label="Activities" value={content.activities.length.toString()} />
          <Metric label="Evidence" value={learner.observations.length.toString()} />
        </div>
        <div className="section-title">
          <h2>Current Frontier</h2>
          <button type="button" className="quiet-button" onClick={onResetDemo}>
            Reset Demo
          </button>
        </div>
        <div className="recommendation-list">
          {recommendations.map((recommendation) => (
            <article className="recommendation-card" key={recommendation.skill_id}>
              <div>
                <p className={`pill ${recommendation.kind}`}>{recommendation.kind}</p>
                <h3>{recommendation.skill_title}</h3>
                <p>{recommendation.activity_title}</p>
              </div>
              <button type="button" onClick={() => onStartActivity(recommendation.activity_id)}>
                Start
              </button>
            </article>
          ))}
        </div>
      </div>

      <div className="coverage-panel">
        <div className="section-title">
          <h2>Domain Coverage</h2>
          <p>{learner.display_name}</p>
        </div>
        <div className="coverage-list">
          {coverage.slice(0, 9).map((domain) => (
            <div className="coverage-row" key={domain.domain}>
              <span>{formatLabel(domain.domain)}</span>
              <div className="bar-track">
                <div style={{ width: `${Math.round((domain.active / domain.total) * 100)}%` }} />
              </div>
              <strong>
                {domain.active}/{domain.total}
              </strong>
            </div>
          ))}
        </div>
      </div>

      <div className="asset-panel">
        <div className="section-title">
          <h2>Assets</h2>
          <label className="file-button">
            Add Photo
            <input
              accept="image/*"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void onAddAsset(file)
              }}
            />
          </label>
        </div>
        <div className="asset-strip">
          {assets.slice(0, 10).map((asset) => (
            <AssetTile asset={asset} compact key={asset.id} />
          ))}
        </div>
      </div>

      <div className="log-panel">
        <div className="section-title">
          <h2>Off-Screen Evidence</h2>
          <p>{learner.observations[0]?.timestamp ? new Date(learner.observations.at(-1)!.timestamp).toLocaleTimeString() : ''}</p>
        </div>
        <div className="manual-log">
          <select value={selectedSkill} onChange={(event) => setSelectedSkill(event.target.value)}>
            {content.skills.slice(0, 34).map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.title}
              </option>
            ))}
          </select>
          <input
            value={note}
            placeholder="Brief observation"
            onChange={(event) => setNote(event.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              onLogObservation({
                skillIds: [selectedSkill],
                activityId: 'act.offscreen_parent_log.v1',
                response: 'prompted',
                promptLevel: 'P2_repeat',
                source: 'real_world',
                generalization: true,
                notes: note || 'Real-world parent observation.',
                setting: 'home',
                material: 'real_object',
              })
              setNote('')
            }}
          >
            Log
          </button>
        </div>
        <div className="observation-list">
          {learner.observations.slice(-5).reverse().map((observation) => (
            <p key={observation.id}>
              <strong>{observation.result.response}</strong> · {observation.skill_ids[0].replace('.v1', '')}
            </p>
          ))}
        </div>
      </div>
    </section>
  )
}

function PhotoPointActivity({
  assets,
  onBack,
  onLogObservation,
}: {
  assets: AssetItem[]
  onBack: () => void
  onLogObservation: (input: ObservationInput) => void
}) {
  const choices = assets.slice(0, 4)
  const target = choices[0]
  const [selected, setSelected] = useState<AssetItem | null>(null)

  return (
    <section className="activity-screen">
      <ActivityHeader title="Photo Point" prompt={`Where is the ${target.label}?`} onBack={onBack} />
      <div className="choice-grid">
        {choices.map((asset) => (
          <button
            className={selected?.id === asset.id ? 'choice-tile selected' : 'choice-tile'}
            key={asset.id}
            type="button"
            onClick={() => setSelected(asset)}
          >
            <AssetTile asset={asset} />
          </button>
        ))}
      </div>
      <ScoringPanel
        activityId="act.photo_point.v1"
        defaultNotes={selected ? `Selected ${selected.label}.` : 'Photo choice activity.'}
        defaultSource="app_probe"
        generalizationDefault={false}
        skillIds={['vocab.familiar_nouns.v1', 'questions.what_object.v1']}
        onScore={onLogObservation}
      />
    </section>
  )
}

function PutItSomewhereActivity({
  onBack,
  onLogObservation,
}: {
  onBack: () => void
  onLogObservation: (input: ObservationInput) => void
}) {
  const prompts = [
    'Put the bear in the box.',
    'Put the cup on the table.',
    'Find the car under the chair.',
  ]
  const [index, setIndex] = useState(0)

  return (
    <section className="activity-screen">
      <ActivityHeader title="Put It Somewhere" prompt={prompts[index]} onBack={onBack} />
      <div className="object-stage" aria-label="Parent-led real-object prompt">
        <div className="stage-object">🧸</div>
        <div className="stage-target">▢</div>
        <div className="stage-object">🥤</div>
      </div>
      <div className="activity-actions">
        <button type="button" onClick={() => setIndex((index + 1) % prompts.length)}>
          Next Prompt
        </button>
      </div>
      <ScoringPanel
        activityId="act.put_it_somewhere.v1"
        defaultNotes={prompts[index]}
        defaultSource="real_world"
        generalizationDefault
        skillIds={['concept.prepositions.in_on_under.v1', 'receptive.one_step.v1']}
        onScore={onLogObservation}
      />
    </section>
  )
}

function ActivityHeader({ title, prompt, onBack }: { title: string; prompt: string; onBack: () => void }) {
  return (
    <div className="activity-header">
      <button type="button" className="quiet-button" onClick={onBack}>
        Dashboard
      </button>
      <div>
        <p className="eyebrow">{title}</p>
        <h2>{prompt}</h2>
      </div>
    </div>
  )
}

function ScoringPanel({
  activityId,
  defaultNotes,
  defaultSource,
  generalizationDefault,
  skillIds,
  onScore,
}: {
  activityId: string
  defaultNotes: string
  defaultSource: ObservationInput['source']
  generalizationDefault: boolean
  skillIds: string[]
  onScore: (input: ObservationInput) => void
}) {
  const [promptLevel, setPromptLevel] = useState<PromptLevel>('P0_independent')
  const [source, setSource] = useState<ObservationInput['source']>(defaultSource)
  const [generalization, setGeneralization] = useState(generalizationDefault)
  const scoreOptions: Array<{ label: string; value: ObservationResult }> = [
    { label: 'Independent', value: 'independent' },
    { label: 'Prompted', value: 'prompted' },
    { label: 'Partial', value: 'partial' },
    { label: 'Not Yet', value: 'not_yet' },
  ]

  return (
    <div className="scoring-panel">
      <div className="score-controls">
        <label>
          Prompt
          <select value={promptLevel} onChange={(event) => setPromptLevel(event.target.value as PromptLevel)}>
            {promptLevels.map((level) => (
              <option key={level} value={level}>
                {formatLabel(level.replace(/^P\d_/, ''))}
              </option>
            ))}
          </select>
        </label>
        <label>
          Source
          <select value={source} onChange={(event) => setSource(event.target.value as ObservationInput['source'])}>
            <option value="app_probe">App</option>
            <option value="real_world">Real world</option>
            <option value="parent_log">Parent log</option>
            <option value="recheck">Recheck</option>
          </select>
        </label>
        <label className="checkline">
          <input
            checked={generalization}
            type="checkbox"
            onChange={(event) => setGeneralization(event.target.checked)}
          />
          Generalized
        </label>
      </div>
      <div className="score-buttons">
        {scoreOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() =>
              onScore({
                skillIds,
                activityId,
                response: option.value,
                promptLevel,
                source,
                generalization,
                notes: defaultNotes,
                setting: source === 'app_probe' ? 'app' : 'home',
                material: source === 'app_probe' ? 'own_photo' : 'real_object',
              })
            }
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function SimulationPanel({ results }: { results: ReturnType<typeof runSimulationSuite> }) {
  return (
    <section className="simulation-panel">
      <div className="section-title">
        <h2>Simulation Harness</h2>
        <p>
          {results.filter((result) => result.passed).length}/{results.length} passing
        </p>
      </div>
      <div className="simulation-grid">
        {results.map((result) => (
          <article className="simulation-card" key={result.profile_id}>
            <p className={result.passed ? 'pill passed' : 'pill blocked'}>{result.passed ? 'passed' : 'review'}</p>
            <h3>{result.description}</h3>
            <ol>
              {result.recommendations.slice(0, 3).map((recommendation) => (
                <li key={recommendation.skill_id}>{recommendation.skill_title}</li>
              ))}
            </ol>
            {result.notes.map((note) => (
              <p className="sim-note" key={note}>
                {note}
              </p>
            ))}
          </article>
        ))}
      </div>
    </section>
  )
}

function AssetTile({ asset, compact = false }: { asset: AssetItem; compact?: boolean }) {
  return (
    <span className={compact ? 'asset-tile compact' : 'asset-tile'}>
      {asset.kind === 'image' ? <img alt="" src={asset.value} /> : <span>{asset.value}</span>}
      <small>{asset.label}</small>
    </span>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

interface ObservationInput {
  skillIds: string[]
  activityId: string
  response: ObservationResult
  promptLevel: PromptLevel
  source: 'app_probe' | 'parent_log' | 'real_world' | 'recheck'
  generalization: boolean
  notes: string
  setting?: string
  material?: string
}

function formatLabel(value: string): string {
  return value
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .replace(/\bAnd\b/g, 'and')
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export default App
