import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { defaultAssets } from './domain/assets'
import { content } from './domain/content'
import {
  buildGraphModel,
  domainCoverage,
  prerequisitesFor,
  unlocksFor,
  validateGraph,
  type DependencyEdge,
  type SkillGraphNode,
} from './domain/graph'
import { createDemoLearner, learnerFromSimulation, makeObservation, recordObservation } from './domain/mastery'
import { recommendNextActivities } from './domain/recommendations'
import { runSimulationSuite } from './domain/simulations'
import { useLocalStorageState } from './domain/storage'
import type { AssetItem, LearnerState, ObservationResult, PromptLevel, Recommendation, SkillNode } from './domain/types'

type ViewMode = 'dashboard' | 'graph' | 'photo-point' | 'put-it-somewhere' | 'simulations'
type ScoreChoice = 'got_it' | 'with_help' | 'almost' | 'not_yet'

const activityHelpOptions: Array<{ label: string; value: PromptLevel }> = [
  { label: 'No Help', value: 'P0_independent' },
  { label: 'Waited', value: 'P1_wait' },
  { label: 'Repeated', value: 'P2_repeat' },
  { label: 'Pointed', value: 'P3_gesture' },
  { label: 'Choice', value: 'P4_binary_choice' },
  { label: 'Showed', value: 'P5_model' },
]

const scoreChoices: Array<{ label: string; value: ScoreChoice; response: ObservationResult }> = [
  { label: 'Got It', value: 'got_it', response: 'independent' },
  { label: 'With Help', value: 'with_help', response: 'prompted' },
  { label: 'Almost', value: 'almost', response: 'partial' },
  { label: 'Not Yet', value: 'not_yet', response: 'not_yet' },
]

const storageKey = 'tla.mvp.learner.v1'
const assetStorageKey = 'tla.mvp.assets.v2'

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
          <button className={view === 'graph' ? 'active' : ''} type="button" onClick={() => setView('graph')}>
            Graph
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

      {view === 'graph' && <GraphPanel learner={learner} recommendations={recommendations} />}

      {view === 'photo-point' && (
        <PhotoPointActivity assets={assets} onBack={() => setView('dashboard')} onLogObservation={logObservation} />
      )}

      {view === 'put-it-somewhere' && (
        <PutItSomewhereActivity assets={assets} onBack={() => setView('dashboard')} onLogObservation={logObservation} />
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
          {assets.map((asset) => (
            <AssetTile asset={asset} compact key={asset.id} />
          ))}
        </div>
      </div>

      <ParentPromptPanel recommendations={recommendations} onLogObservation={onLogObservation} />

      <QuickLogPanel learner={learner} onLogObservation={onLogObservation} />
    </section>
  )
}

function ParentPromptPanel({
  recommendations,
  onLogObservation,
}: {
  recommendations: Recommendation[]
  onLogObservation: (input: ObservationInput) => void
}) {
  const parentPrompts = recommendations.slice(0, 3).map((recommendation, index) => makeParentPrompt(recommendation, index))

  return (
    <div className="parent-prompt-panel">
      <div className="section-title">
        <h2>Today&apos;s Parent Prompts</h2>
        <p>Real-world transfer</p>
      </div>
      <div className="parent-prompt-list">
        {parentPrompts.map((prompt) => (
          <article className="parent-prompt-card" key={prompt.skillId}>
            <div>
              <p className={`pill ${prompt.kind}`}>{prompt.context}</p>
              <h3>{prompt.skillTitle}</h3>
              <p>{prompt.action}</p>
            </div>
            <ResultButtonRow
              compact
              onChoose={(choice) =>
                onLogObservation({
                  skillIds: [prompt.skillId],
                  activityId: 'act.parent_prompt.v1',
                  response: choice.response,
                  promptLevel: promptLevelForChoice(choice.value, 'P2_repeat'),
                  source: 'real_world',
                  generalization: true,
                  notes: prompt.action,
                  setting: prompt.setting,
                  material: prompt.material,
                })
              }
            />
          </article>
        ))}
      </div>
    </div>
  )
}

function QuickLogPanel({
  learner,
  onLogObservation,
}: {
  learner: LearnerState
  onLogObservation: (input: ObservationInput) => void
}) {
  const [selectedSkill, setSelectedSkill] = useState('concept.prepositions.in_on_under.v1')
  const [note, setNote] = useState('')
  const selectedSkillTitle = content.skills.find((skill) => skill.id === selectedSkill)?.title ?? selectedSkill
  const lastObservation = learner.observations.at(-1)

  return (
    <div className="log-panel">
      <div className="section-title">
        <h2>Quick Log</h2>
        <p>{lastObservation ? new Date(lastObservation.timestamp).toLocaleTimeString() : ''}</p>
      </div>
      <div className="quick-log-fields">
        <select value={selectedSkill} onChange={(event) => setSelectedSkill(event.target.value)}>
          {content.skills.slice(0, 34).map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.title}
            </option>
          ))}
        </select>
        <input value={note} placeholder="What happened?" onChange={(event) => setNote(event.target.value)} />
      </div>
      <ResultButtonRow
        onChoose={(choice) => {
          onLogObservation({
            skillIds: [selectedSkill],
            activityId: 'act.quick_parent_log.v1',
            response: choice.response,
            promptLevel: promptLevelForChoice(choice.value, 'P2_repeat'),
            source: 'parent_log',
            generalization: true,
            notes: note || selectedSkillTitle,
            setting: 'home',
            material: 'real_object',
          })
          setNote('')
        }}
      />
      <div className="observation-list">
        {learner.observations.slice(-5).reverse().map((observation) => (
          <p key={observation.id}>
            <strong>{formatLabel(observation.result.response)}</strong> · {observation.skill_ids[0].replace('.v1', '')}
          </p>
        ))}
      </div>
    </div>
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
  const eligibleAssets = useMemo(() => assets.filter((asset) => isEligibleFor(asset, 'photo_point')), [assets])
  const [round, setRound] = useState(0)
  const choices = useMemo(() => makeAssetChoices(eligibleAssets, round, 4), [eligibleAssets, round])
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
      <div className="activity-actions">
        <button
          type="button"
          onClick={() => {
            setRound((currentRound) => currentRound + 1)
            setSelected(null)
          }}
        >
          Next Set
        </button>
      </div>
      <ScoringPanel
        activityId="act.photo_point.v1"
        defaultNotes={selected ? `Selected ${selected.label}.` : 'Photo choice activity.'}
        skillIds={['vocab.familiar_nouns.v1', 'questions.what_object.v1']}
        onScore={onLogObservation}
      />
    </section>
  )
}

function PutItSomewhereActivity({
  assets,
  onBack,
  onLogObservation,
}: {
  assets: AssetItem[]
  onBack: () => void
  onLogObservation: (input: ObservationInput) => void
}) {
  const prompts = [
    { object: 'bear', relation: 'in', target: 'box', text: 'Put the bear in the box.' },
    { object: 'cup', relation: 'on', target: 'table', text: 'Put the cup on the table.' },
    { object: 'car', relation: 'under', target: 'chair', text: 'Find the car under the chair.' },
    { object: 'ball', relation: 'on', target: 'bed', text: 'Put the ball on the bed.' },
    { object: 'truck', relation: 'in', target: 'box', text: 'Put the truck in the box.' },
  ]
  const [index, setIndex] = useState(0)
  const currentPrompt = prompts[index]
  const objectAsset = findAssetByLabel(assets, currentPrompt.object)
  const targetAsset = findAssetByLabel(assets, currentPrompt.target)

  return (
    <section className="activity-screen">
      <ActivityHeader title="Put It Somewhere" prompt={currentPrompt.text} onBack={onBack} />
      <div className="object-stage" aria-label="Parent-led real-object prompt">
        <StageAssetCard asset={objectAsset} />
        <div className="stage-relation">{currentPrompt.relation}</div>
        <StageAssetCard asset={targetAsset} />
      </div>
      <div className="activity-actions">
        <button type="button" onClick={() => setIndex((index + 1) % prompts.length)}>
          Next Prompt
        </button>
      </div>
      <ScoringPanel
        activityId="act.put_it_somewhere.v1"
        defaultNotes={currentPrompt.text}
        evidenceLabel="Real-world transfer"
        source="real_world"
        generalization
        setting="home"
        material="real_object"
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
  evidenceLabel = 'App evidence',
  generalization = false,
  material = 'own_photo',
  setting = 'app',
  skillIds,
  source = 'app_probe',
  onScore,
}: {
  activityId: string
  defaultNotes: string
  evidenceLabel?: string
  generalization?: boolean
  material?: string
  setting?: string
  skillIds: string[]
  source?: ObservationInput['source']
  onScore: (input: ObservationInput) => void
}) {
  const [helpGiven, setHelpGiven] = useState<PromptLevel>('P0_independent')

  return (
    <div className="scoring-panel">
      <div className="scoring-header">
        <div>
          <p className="eyebrow">Activity Result</p>
          <h3>Score This Round</h3>
        </div>
        <span>{evidenceLabel}</span>
      </div>
      <div className="help-selector" aria-label="Help given">
        <p>Help Given</p>
        <div className="help-options">
          {activityHelpOptions.map((option) => (
            <button
              className={helpGiven === option.value ? 'active' : ''}
              key={option.value}
              type="button"
              onClick={() => setHelpGiven(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <ResultButtonRow
        onChoose={(choice) =>
          onScore({
            skillIds,
            activityId,
            response: choice.response,
            promptLevel: promptLevelForChoice(choice.value, helpGiven),
            source,
            generalization,
            notes: defaultNotes,
            setting,
            material,
          })
        }
      />
    </div>
  )
}

function ResultButtonRow({
  compact = false,
  onChoose,
}: {
  compact?: boolean
  onChoose: (choice: (typeof scoreChoices)[number]) => void
}) {
  return (
    <div className={compact ? 'score-buttons compact' : 'score-buttons'}>
      {scoreChoices.map((choice) => (
        <button key={choice.value} type="button" onClick={() => onChoose(choice)}>
          {choice.label}
        </button>
      ))}
    </div>
  )
}

function promptLevelForChoice(choice: ScoreChoice, helpGiven: PromptLevel): PromptLevel {
  if (choice === 'got_it') return 'P0_independent'
  if (choice === 'with_help' && helpGiven === 'P0_independent') return 'P2_repeat'
  return helpGiven
}

function makeParentPrompt(recommendation: Recommendation, index: number) {
  const contexts = [
    { label: 'Snack', setting: 'kitchen', material: 'real_object' },
    { label: 'Cleanup', setting: 'playroom', material: 'real_object' },
    { label: 'Book', setting: 'reading', material: 'book' },
  ]
  const context = contexts[index % contexts.length]
  return {
    action: parentPromptAction(recommendation),
    context: context.label,
    kind: recommendation.kind,
    material: context.material,
    setting: context.setting,
    skillId: recommendation.skill_id,
    skillTitle: recommendation.skill_title,
  }
}

function parentPromptAction(recommendation: Recommendation): string {
  const id = recommendation.skill_id
  const title = recommendation.skill_title.toLowerCase()
  if (id.includes('preposition') || title.includes('preposition')) return 'Ask for one placement: in, on, or under.'
  if (id.includes('one_step') || title.includes('one step')) return 'Give one short direction with a familiar object.'
  if (id.includes('where') || title.includes('where')) return 'Hide a toy in view, then ask where it is.'
  if (id.includes('what_object') || title.includes('what')) return 'Point to a familiar thing and ask what it is.'
  if (id.includes('category') || title.includes('categor')) return 'Sort two familiar things into a simple group.'
  if (id.includes('verb') || title.includes('action')) return 'Act out one familiar action and name it together.'
  if (id.includes('noun') || title.includes('vocab')) return 'Name three familiar things during the routine.'
  return `Work on ${recommendation.skill_title.toLowerCase()} during a normal routine.`
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

function GraphPanel({ learner, recommendations }: { learner: LearnerState; recommendations: Recommendation[] }) {
  const graph = useMemo(() => buildGraphModel(content), [])
  const validation = useMemo(() => validateGraph(content), [])
  const [overlayProfileId, setOverlayProfileId] = useState('current')
  const overlayLearner = useMemo(() => {
    const profile = content.simulation_profiles.find((candidate) => candidate.id === overlayProfileId)
    return profile ? learnerFromSimulation(content, profile) : learner
  }, [learner, overlayProfileId])
  const overlayRecommendations = useMemo(
    () => (overlayProfileId === 'current' ? recommendations : recommendNextActivities(content, overlayLearner, 8)),
    [overlayLearner, overlayProfileId, recommendations],
  )
  const frontierIds = new Set(overlayRecommendations.map((recommendation) => recommendation.skill_id))
  const initialSelected = overlayRecommendations[0]?.skill_id ?? graph.nodes[0]?.id
  const [selectedSkillId, setSelectedSkillId] = useState(initialSelected)
  const selectedSkill = content.skills.find((skill) => skill.id === selectedSkillId) ?? content.skills[0]
  const selectedPrereqs = prerequisitesFor(content, selectedSkill.id)
  const selectedUnlocks = unlocksFor(content, selectedSkill.id)
  const pathIds = new Set([
    selectedSkill.id,
    ...selectedPrereqs.map((edge) => edge.prerequisiteId),
    ...selectedUnlocks.map((edge) => edge.topicId),
  ])
  const compactGraph = useMediaQuery('(max-width: 520px)')
  const layout = useMemo(() => buildGraphLayout(graph, compactGraph ? 'compact' : 'regular'), [compactGraph, graph])

  return (
    <section className="graph-shell">
      <div className="graph-toolbar">
        <div>
          <p className="eyebrow">Curriculum Inspector</p>
          <h2>Skill Graph</h2>
        </div>
        <label>
          Overlay
          <select value={overlayProfileId} onChange={(event) => setOverlayProfileId(event.target.value)}>
            <option value="current">Current learner</option>
            {content.simulation_profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.description}
              </option>
            ))}
          </select>
        </label>
        <div className={validation.valid ? 'validation-badge valid' : 'validation-badge invalid'}>
          {validation.valid ? 'Graph valid' : 'Graph needs review'}
        </div>
      </div>

      <div className="graph-layout">
        <div className="graph-scroll" aria-label="Scrollable skill graph">
          <div className="graph-canvas" style={{ minHeight: layout.height, width: layout.width }}>
            <svg aria-hidden="true" className="edge-layer" height={layout.height} width={layout.width}>
              {graph.edges.map((edge) => {
                const from = layout.nodes.get(edge.prerequisiteId)
                const to = layout.nodes.get(edge.topicId)
                if (!from || !to) return null
                const active = pathIds.has(edge.prerequisiteId) && pathIds.has(edge.topicId)
                return (
                  <path
                    className={`graph-edge ${edge.strength} ${active ? 'active' : ''}`}
                    d={`M ${from.x + from.width} ${from.y + from.height / 2} C ${from.x + from.width + 70} ${
                      from.y + from.height / 2
                    }, ${to.x - 70} ${to.y + to.height / 2}, ${to.x} ${to.y + to.height / 2}`}
                    key={edge.id}
                  />
                )
              })}
            </svg>
            {layout.domainLabels.map((label) => (
              <div className="domain-label" key={label.domain} style={{ top: label.y }}>
                {formatLabel(label.domain)}
              </div>
            ))}
            {graph.nodes.map((node) => {
              const position = layout.nodes.get(node.id)
              const state = overlayLearner.skill_states[node.id]?.current_state ?? 'not_seen'
              if (!position) return null
              return (
                <button
                  className={[
                    'graph-node',
                    `domain-${safeClass(node.domain)}`,
                    `state-${safeClass(state)}`,
                    frontierIds.has(node.id) ? 'frontier-node' : '',
                    selectedSkill.id === node.id ? 'selected-node' : '',
                    pathIds.has(node.id) ? 'path-node' : '',
                  ].join(' ')}
                  key={node.id}
                  style={{
                    left: position.x,
                    top: position.y,
                    width: position.width,
                    height: position.height,
                  }}
                  type="button"
                  onClick={() => setSelectedSkillId(node.id)}
                >
                  <span>{node.name}</span>
                  <small>{formatLabel(node.domain)}</small>
                </button>
              )
            })}
          </div>
        </div>

        <SkillInspector
          overlayLearner={overlayLearner}
          recommendations={overlayRecommendations}
          selectedPrereqs={selectedPrereqs}
          selectedSkill={selectedSkill}
          selectedUnlocks={selectedUnlocks}
          validation={validation}
        />
      </div>
    </section>
  )
}

function SkillInspector({
  overlayLearner,
  recommendations,
  selectedPrereqs,
  selectedSkill,
  selectedUnlocks,
  validation,
}: {
  overlayLearner: LearnerState
  recommendations: Recommendation[]
  selectedPrereqs: DependencyEdge[]
  selectedSkill: SkillNode
  selectedUnlocks: DependencyEdge[]
  validation: ReturnType<typeof validateGraph>
}) {
  const state = overlayLearner.skill_states[selectedSkill.id]?.current_state ?? 'not_seen'
  const recommendation = recommendations.find((candidate) => candidate.skill_id === selectedSkill.id)
  return (
    <aside className="skill-inspector">
      <p className={`pill ${recommendation?.kind ?? 'exploration'}`}>{recommendation?.kind ?? 'inspect'}</p>
      <h3>{selectedSkill.title}</h3>
      <p className="inspector-description">{selectedSkill.description}</p>
      <div className="inspector-grid">
        <Metric label="State" value={formatLabel(state)} />
        <Metric label="Domain" value={formatLabel(selectedSkill.domain)} />
      </div>

      <InspectorSection title="Prerequisites" edges={selectedPrereqs} empty="No prerequisites." direction="prereq" />
      <InspectorSection title="Unlocks" edges={selectedUnlocks} empty="No downstream skills yet." direction="unlock" />

      <div className="inspector-section">
        <h4>Evidence and Mastery</h4>
        <ul>
          <li>{selectedSkill.developmental_goal}</li>
          <li>
            Mastery requires {selectedSkill.mastery?.evidence_requirements?.min_positive_observations ?? 5} positive
            observations across {selectedSkill.mastery?.evidence_requirements?.min_contexts ?? 2} contexts.
          </li>
          {(selectedSkill.evidence_notes?.do_not_drill ?? []).map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>

      <div className="inspector-section">
        <h4>Activities</h4>
        <ul>
          {(selectedSkill.activities ?? []).map((activity) => (
            <li key={activity.activity_id}>{activity.activity_id}</li>
          ))}
          {recommendation && <li>Recommended now: {recommendation.activity_title}</li>}
        </ul>
      </div>

      <div className="inspector-section">
        <h4>Validation</h4>
        <p>
          {validation.valid
            ? 'No missing references, hard cycles, activity reference errors, or anti-drill violations.'
            : 'Validation issues are present.'}
        </p>
      </div>
    </aside>
  )
}

function InspectorSection({
  direction,
  edges,
  empty,
  title,
}: {
  direction: 'prereq' | 'unlock'
  edges: DependencyEdge[]
  empty: string
  title: string
}) {
  return (
    <div className="inspector-section">
      <h4>{title}</h4>
      {edges.length === 0 ? (
        <p>{empty}</p>
      ) : (
        <ul>
          {edges.map((edge) => (
            <li key={edge.id}>
              <strong>{edge.strength}</strong> · {direction === 'prereq' ? edge.prerequisiteId : edge.topicId}
              <br />
              <span>{edge.reason}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

function buildGraphLayout(graph: { nodes: SkillGraphNode[]; edges: DependencyEdge[] }, density: 'regular' | 'compact' = 'regular') {
  const domainOrder = [
    'engagement',
    'vocabulary',
    'semantics',
    'concepts',
    'receptive_language',
    'questions',
    'expressive_language',
    'narrative',
    'sound_play',
    'early_literacy',
    'phonological_awareness',
    'phonics',
    'speech_production',
    'generalization',
  ]
  const hardEdges = graph.edges.filter((edge) => edge.strength === 'hard')
  const prereqsByNode = new Map<string, string[]>()
  for (const edge of hardEdges) {
    prereqsByNode.set(edge.topicId, [...(prereqsByNode.get(edge.topicId) ?? []), edge.prerequisiteId])
  }
  const levelCache = new Map<string, number>()
  function levelFor(nodeId: string, stack = new Set<string>()): number {
    if (levelCache.has(nodeId)) return levelCache.get(nodeId)!
    if (stack.has(nodeId)) return 0
    stack.add(nodeId)
    const prereqLevels = (prereqsByNode.get(nodeId) ?? []).map((id) => levelFor(id, stack))
    stack.delete(nodeId)
    const level = prereqLevels.length ? Math.max(...prereqLevels) + 1 : 0
    levelCache.set(nodeId, level)
    return level
  }

  const grouped = new Map<string, SkillGraphNode[]>()
  for (const node of graph.nodes) {
    grouped.set(node.domain, [...(grouped.get(node.domain) ?? []), node])
  }

  const nodes = new Map<string, { x: number; y: number; width: number; height: number }>()
  const domainLabels: Array<{ domain: string; y: number }> = []
  let yCursor = 34
  let maxLevel = 0
  const compact = density === 'compact'
  const width = compact ? 170 : 194
  const height = compact ? 68 : 58
  const xStart = compact ? 118 : 150
  const xGap = compact ? 230 : 244
  const yGap = compact ? 82 : 73

  const orderedDomains = [...new Set([...domainOrder, ...graph.nodes.map((node) => node.domain)])]
  for (const domain of orderedDomains) {
    const domainNodes = (grouped.get(domain) ?? []).sort((a, b) => levelFor(a.id) - levelFor(b.id) || a.name.localeCompare(b.name))
    if (domainNodes.length === 0) continue
    domainLabels.push({ domain, y: yCursor + 18 })
    domainNodes.forEach((node, index) => {
      const level = levelFor(node.id)
      maxLevel = Math.max(maxLevel, level)
      nodes.set(node.id, {
        x: xStart + level * xGap,
        y: yCursor + index * yGap,
        width,
        height,
      })
    })
    yCursor += domainNodes.length * yGap + 28
  }

  return {
    nodes,
    domainLabels,
    width: Math.max(compact ? 860 : 980, (compact ? 300 : 380) + (maxLevel + 1) * xGap),
    height: yCursor + 20,
  }
}

function isEligibleFor(asset: AssetItem, activityId: string): boolean {
  return asset.activityEligibility?.includes(activityId) ?? true
}

function makeAssetChoices(assets: AssetItem[], round: number, size: number): AssetItem[] {
  if (assets.length <= size) return assets
  const start = (round * size) % assets.length
  return Array.from({ length: size }, (_, offset) => assets[(start + offset) % assets.length])
}

function findAssetByLabel(assets: AssetItem[], label: string): AssetItem {
  const asset = assets.find((candidate) => candidate.label === label) ?? defaultAssets.find((candidate) => candidate.label === label)
  if (!asset) throw new Error(`Missing asset for label: ${label}`)
  return asset
}

function StageAssetCard({ asset }: { asset: AssetItem }) {
  return (
    <div className="stage-object">
      <AssetVisual asset={asset} />
      <small>{asset.label}</small>
    </div>
  )
}

function AssetTile({ asset, compact = false }: { asset: AssetItem; compact?: boolean }) {
  return (
    <span className={compact ? 'asset-tile compact' : 'asset-tile'}>
      <AssetVisual asset={asset} />
      <small>{asset.label}</small>
    </span>
  )
}

function AssetVisual({ asset }: { asset: AssetItem }) {
  return asset.kind === 'image' ? <img alt={asset.label} src={asset.value} /> : <span>{asset.value}</span>
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

function safeClass(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_')
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
