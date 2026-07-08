export type MasteryState =
  | 'not_seen'
  | 'introduced'
  | 'emerging_receptive'
  | 'emerging_expressive'
  | 'assisted_success'
  | 'independent_in_activity'
  | 'generalizing'
  | 'mastered'
  | 'maintenance_due'
  | 'stale'
  | 'regressed'
  | 'blocked'
  | 'deferred'

export type PromptLevel =
  | 'P0_independent'
  | 'P1_wait'
  | 'P2_repeat'
  | 'P3_gesture'
  | 'P4_binary_choice'
  | 'P5_model'
  | 'P6_parent_completes'

export type ObservationSource = 'app_probe' | 'parent_log' | 'real_world' | 'recheck'

export type ObservationResult =
  | 'independent'
  | 'prompted'
  | 'partial'
  | 'not_yet'
  | 'refused'
  | 'no_data'

export type EngagementLevel = 'high' | 'medium' | 'low' | 'dysregulated'

export interface Prerequisite {
  skill_id: string
  min_state: MasteryState
  rationale?: string
  weight?: number
}

export interface RelatedSkills {
  supports?: string[]
  co_practice?: string[]
  transfer_to?: string[]
  contrasts_with?: string[]
  not_a_prerequisite?: string[]
}

export interface SkillNode {
  id: string
  version: number
  title: string
  domain: string
  track: string
  age_band: string
  description: string
  developmental_goal: string
  examples?: string[]
  prerequisites?: {
    hard?: Prerequisite[]
    soft?: Prerequisite[]
    anti_prerequisites?: Array<{ skill_id: string; rationale?: string }>
  }
  related_skills?: RelatedSkills
  probes?: Array<{
    id: string
    modality: string
    expected_response: string
    success_criteria: string
    min_trials: number
    allowed_prompt_levels: PromptLevel[]
  }>
  activities?: Array<{
    activity_id: string
    mode: string
    difficulty_knobs?: Record<string, unknown>
  }>
  difficulty_knobs?: Array<{
    id: string
    type: string
    default: unknown
    values?: unknown[]
  }>
  mastery?: {
    transition_rules?: Record<string, string>
    evidence_requirements?: MasteryEvidenceRequirements
    recheck_interval_days?: number
  }
  evidence_notes?: {
    source_families?: string[]
    rationale?: string
    assumptions?: string[]
    do_not_drill?: string[]
    contraindications?: string[]
  }
}

export interface MasteryEvidenceRequirements {
  min_positive_observations: number
  min_days: number
  min_contexts: number
  require_offscreen: boolean
  max_prompt_level_for_mastery: PromptLevel
}

export interface ActivityTemplate {
  id: string
  title: string
  activity_type: string
  target_skill_ids: {
    primary?: string[]
    secondary?: string[]
  }
  child_ui: {
    max_choices: number
    uses_text: boolean
    uses_parent_voice: boolean
    feedback_style: string
  }
  required_assets?: Array<{
    type: string
    semantic_tags: string[]
  }>
  session_rules: {
    min_items: number
    max_items: number
    stop_on_frustration: boolean
    no_timers: boolean
    no_streaks: boolean
  }
}

export interface ContentPackage {
  schema_version: string
  project: string
  skills: SkillNode[]
  activities: ActivityTemplate[]
  placeholder_skill_ids_for_mvp?: string[]
  mastery_defaults: {
    evidence_requirements: MasteryEvidenceRequirements
    recheck_interval_days: number
    stale_after_days: number
    screen_only_max_state: MasteryState
  }
  recommendation_config: {
    session_mix: Record<string, [number, number]>
    scoring_weights: Record<string, number>
    hard_rules: string[]
  }
  simulation_profiles: SimulationProfile[]
}

export interface SkillStateRecord {
  current_state: MasteryState
  confidence: number
  readiness_score: number
  mastery_score: number
  generalization_score: number
  last_seen_at?: string
  last_mastered_at?: string | null
  due_for_recheck: boolean
  recent_success_rate: number
  prompt_level_distribution: Record<PromptLevel, number>
  contexts_seen: string[]
  materials_seen: string[]
  evidence_events: string[]
  blocked_reason?: string | null
  cooldown_until?: string | null
}

export interface LearnerState {
  learner_id: string
  display_name: string
  birth_month: string
  content_version: string
  preferences: {
    favorite_assets: string[]
    avoid_assets: string[]
  }
  skill_states: Record<string, SkillStateRecord>
  observations: Observation[]
  session_history: Array<{
    session_id: string
    duration_minutes: number
    activities: string[]
    engagement: EngagementLevel
  }>
}

export interface Observation {
  id: string
  learner_id: string
  timestamp: string
  source: ObservationSource
  skill_ids: string[]
  activity_id: string
  response_channel: string
  context: {
    setting: string
    material: string
    partner: string
  }
  result: {
    response: ObservationResult
    prompt_level: PromptLevel
    attempts: number
    engagement: EngagementLevel
  }
  evidence: {
    polarity: 'positive' | 'neutral' | 'negative'
    strength: 'low' | 'medium' | 'high'
    generalization_credit: boolean
    notes: string
  }
}

export interface Recommendation {
  skill_id: string
  skill_title: string
  domain: string
  activity_id: string
  activity_title: string
  score: number
  kind: 'frontier' | 'maintenance' | 'generalization' | 'exploration'
  rationale: string[]
}

export interface SimulationProfile {
  id: string
  description: string
  mastered?: string[]
  emerging?: string[]
  blocked_or_deferred?: string[]
  expected_frontier?: string[]
  expected_activity?: string
  invariant?: string
}

export interface SimulationResult {
  profile_id: string
  description: string
  recommendations: Recommendation[]
  passed: boolean
  notes: string[]
}

export interface AssetSource {
  provider: string
  title: string
  creator: string
  license: string
  sourceUrl: string
  retrievedAt: string
}

export interface SeedAssetDefinition {
  id: string
  label: string
  fileName: string
  tags: readonly string[]
  categories: readonly string[]
  phonemeTargets: readonly string[]
  activityEligibility: readonly string[]
  source: AssetSource
}

export interface AssetItem {
  id: string
  label: string
  tags: string[]
  categories?: string[]
  phonemeTargets?: string[]
  activityEligibility?: string[]
  kind: 'emoji' | 'image'
  value: string
  source?: AssetSource
}
