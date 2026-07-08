import { stateRank } from './graph'
import type {
  ContentPackage,
  LearnerState,
  MasteryState,
  Observation,
  PromptLevel,
  SimulationProfile,
  SkillStateRecord,
} from './types'

export const promptLevels: PromptLevel[] = [
  'P0_independent',
  'P1_wait',
  'P2_repeat',
  'P3_gesture',
  'P4_binary_choice',
  'P5_model',
  'P6_parent_completes',
]

export function emptySkillState(current_state: MasteryState = 'not_seen'): SkillStateRecord {
  return {
    current_state,
    confidence: current_state === 'not_seen' ? 0 : 0.45,
    readiness_score: 0,
    mastery_score: scoreForState(current_state),
    generalization_score: current_state === 'generalizing' || current_state === 'mastered' ? 0.8 : 0,
    last_seen_at: undefined,
    last_mastered_at: null,
    due_for_recheck: false,
    recent_success_rate: 0,
    prompt_level_distribution: {
      P0_independent: 0,
      P1_wait: 0,
      P2_repeat: 0,
      P3_gesture: 0,
      P4_binary_choice: 0,
      P5_model: 0,
      P6_parent_completes: 0,
    },
    contexts_seen: [],
    materials_seen: [],
    evidence_events: [],
    blocked_reason: null,
    cooldown_until: null,
  }
}

export function createDemoLearner(content: ContentPackage): LearnerState {
  const learner: LearnerState = {
    learner_id: 'learner.local_child_001',
    display_name: 'Toddler',
    birth_month: '2024-04',
    content_version: `tla-core@${content.schema_version}`,
    preferences: {
      favorite_assets: ['asset.dog', 'asset.car'],
      avoid_assets: [],
    },
    skill_states: {},
    observations: [],
    session_history: [],
  }

  setSkill(learner, 'engagement.shared_attention.v1', 'mastered', 0.95, 0.95)
  setSkill(learner, 'vocab.familiar_nouns.v1', 'generalizing', 0.8, 0.8)
  setSkill(learner, 'receptive.one_step.v1', 'generalizing', 0.75, 0.75)
  setSkill(learner, 'vocab.verbs.common_actions.v1', 'emerging_receptive', 0.48, 0.2)
  setSkill(learner, 'concept.prepositions.in_on_under.v1', 'introduced', 0.32, 0.05)
  setSkill(learner, 'concept.categories.basic.v1', 'introduced', 0.3, 0.05)
  setSkill(learner, 'questions.where.v1', 'introduced', 0.28, 0.05)
  return learner
}

export function learnerFromSimulation(content: ContentPackage, profile: SimulationProfile): LearnerState {
  const learner = createDemoLearner(content)
  learner.learner_id = `learner.${profile.id}`
  learner.display_name = profile.description
  learner.skill_states = {}
  learner.observations = []

  for (const skillId of profile.mastered ?? []) setSkillWithPrereqs(content, learner, skillId, 'mastered')
  for (const skillId of profile.emerging ?? []) setSkillWithPrereqs(content, learner, skillId, 'emerging_receptive')
  for (const skillId of profile.blocked_or_deferred ?? []) setSkill(learner, skillId, 'deferred', 0.8, 0)

  if (profile.id.includes('screen_only')) {
    setSkill(learner, 'engagement.shared_attention.v1', 'mastered', 0.9, 0.9)
    setSkill(learner, 'vocab.familiar_nouns.v1', 'independent_in_activity', 0.7, 0.08, ['app_photo_choice'])
  }

  if (profile.id.includes('early_letters')) {
    setSkill(learner, 'engagement.shared_attention.v1', 'mastered', 0.9, 0.9)
    setSkill(learner, 'print.book_handling.v1', 'generalizing', 0.8, 0.8)
    setSkill(learner, 'print.environmental_print.v1', 'generalizing', 0.75, 0.7)
    setSkill(learner, 'print.letter_names.v1', 'independent_in_activity', 0.72, 0.2)
  }

  return learner
}

export function recordObservation(content: ContentPackage, learner: LearnerState, observation: Observation): LearnerState {
  const next: LearnerState = {
    ...learner,
    skill_states: { ...learner.skill_states },
    observations: [...learner.observations, observation],
  }

  for (const skillId of observation.skill_ids) {
    const current = next.skill_states[skillId] ?? emptySkillState()
    next.skill_states[skillId] = updateSkillState(content, current, observation)
  }

  return next
}

export function updateSkillState(
  content: ContentPackage,
  current: SkillStateRecord,
  observation: Observation,
): SkillStateRecord {
  const positive = observation.evidence.polarity === 'positive' && observation.result.response !== 'no_data'
  const contexts = unique([...current.contexts_seen, observation.context.setting, observation.source])
  const materials = unique([...current.materials_seen, observation.context.material])
  const promptDistribution = { ...current.prompt_level_distribution }
  promptDistribution[observation.result.prompt_level] += 1

  let nextState = current.current_state
  if (positive) {
    if (observation.result.prompt_level === 'P5_model' || observation.result.prompt_level === 'P6_parent_completes') {
      nextState = maxState(nextState, 'assisted_success')
    } else if (observation.source === 'app_probe' && !observation.evidence.generalization_credit) {
      nextState = maxState(nextState, content.mastery_defaults.screen_only_max_state)
    } else if (observation.evidence.generalization_credit || observation.source === 'real_world') {
      nextState = maxState(nextState, 'generalizing')
    } else {
      nextState = maxState(nextState, 'emerging_receptive')
    }
  } else if (observation.result.response === 'not_yet') {
    nextState = current.current_state === 'not_seen' ? 'introduced' : current.current_state
  }

  const positiveObservations = positive ? current.evidence_events.length + 1 : current.evidence_events.length
  const generalizationScore =
    observation.evidence.generalization_credit || observation.source === 'real_world'
      ? Math.min(1, current.generalization_score + 0.35)
      : current.generalization_score
  const masteryScore = Math.max(current.mastery_score, scoreForState(nextState))
  const confidence = Math.min(1, current.confidence + (positive ? 0.1 : 0.03))
  const recentSuccessRate = positive ? Math.min(1, current.recent_success_rate + 0.18) : current.recent_success_rate * 0.85
  const canMaster =
    positiveObservations >= content.mastery_defaults.evidence_requirements.min_positive_observations &&
    contexts.length >= content.mastery_defaults.evidence_requirements.min_contexts &&
    generalizationScore >= 0.7 &&
    promptRank(observation.result.prompt_level) <= promptRank(content.mastery_defaults.evidence_requirements.max_prompt_level_for_mastery)

  if (canMaster) {
    nextState = 'mastered'
  }

  return {
    ...current,
    current_state: nextState,
    confidence,
    readiness_score: Math.max(current.readiness_score, confidence),
    mastery_score: masteryScore,
    generalization_score: generalizationScore,
    last_seen_at: observation.timestamp,
    last_mastered_at: nextState === 'mastered' ? observation.timestamp : current.last_mastered_at,
    due_for_recheck: false,
    recent_success_rate: recentSuccessRate,
    prompt_level_distribution: promptDistribution,
    contexts_seen: contexts,
    materials_seen: materials,
    evidence_events: positive ? unique([...current.evidence_events, observation.id]) : current.evidence_events,
  }
}

export function makeObservation(input: {
  learnerId: string
  skillIds: string[]
  activityId: string
  response: Observation['result']['response']
  promptLevel: PromptLevel
  source: Observation['source']
  generalization: boolean
  notes: string
  setting?: string
  material?: string
  engagement?: Observation['result']['engagement']
}): Observation {
  const positive = input.response === 'independent' || input.response === 'prompted' || input.response === 'partial'
  return {
    id: `obs_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    learner_id: input.learnerId,
    timestamp: new Date().toISOString(),
    source: input.source,
    skill_ids: input.skillIds,
    activity_id: input.activityId,
    response_channel: input.source === 'app_probe' ? 'tap' : 'parent_judgment',
    context: {
      setting: input.setting ?? (input.source === 'app_probe' ? 'app' : 'home'),
      material: input.material ?? (input.source === 'app_probe' ? 'own_photo' : 'real_object'),
      partner: 'parent',
    },
    result: {
      response: input.response,
      prompt_level: input.promptLevel,
      attempts: 1,
      engagement: input.engagement ?? 'medium',
    },
    evidence: {
      polarity: positive ? 'positive' : input.response === 'not_yet' ? 'neutral' : 'negative',
      strength: input.response === 'independent' ? 'high' : input.response === 'prompted' ? 'medium' : 'low',
      generalization_credit: input.generalization,
      notes: input.notes,
    },
  }
}

function setSkill(
  learner: LearnerState,
  skillId: string,
  state: MasteryState,
  confidence = 0.5,
  generalizationScore = 0.2,
  contexts = ['home'],
) {
  learner.skill_states[skillId] = {
    ...emptySkillState(state),
    confidence,
    readiness_score: confidence,
    mastery_score: scoreForState(state),
    generalization_score: generalizationScore,
    contexts_seen: contexts,
    materials_seen: contexts.includes('app_photo_choice') ? ['own_photo'] : ['real_object'],
    recent_success_rate: confidence,
  }
}

function setSkillWithPrereqs(content: ContentPackage, learner: LearnerState, skillId: string, state: MasteryState) {
  const skill = content.skills.find((candidate) => candidate.id === skillId)
  for (const prereq of skill?.prerequisites?.hard ?? []) {
    if (!learner.skill_states[prereq.skill_id]) {
      setSkill(learner, prereq.skill_id, prereq.min_state, 0.65, prereq.min_state === 'generalizing' ? 0.7 : 0.25)
      setSkillWithPrereqs(content, learner, prereq.skill_id, prereq.min_state)
    }
  }
  setSkill(learner, skillId, state, state === 'mastered' ? 0.9 : 0.45, state === 'mastered' ? 0.9 : 0.2)
}

function scoreForState(state: MasteryState): number {
  return Math.min(1, stateRank(state) / stateRank('mastered'))
}

function maxState(a: MasteryState, b: MasteryState): MasteryState {
  return stateRank(a) >= stateRank(b) ? a : b
}

function promptRank(level: PromptLevel): number {
  return promptLevels.indexOf(level)
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}
