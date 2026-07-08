import { load } from 'js-yaml'
import schemaYaml from '../../../SKILL_SCHEMA.yaml?raw'
import type { ActivityTemplate, ContentPackage, Prerequisite, SkillNode } from './types'

const rawContent = load(schemaYaml) as ContentPackage

function normalizeContent(source: ContentPackage): ContentPackage {
  const skillById = new Map<string, SkillNode>()
  for (const skill of source.skills ?? []) {
    skillById.set(skill.id, skill)
  }

  const referencedIds = new Set<string>(source.placeholder_skill_ids_for_mvp ?? [])
  for (const profile of source.simulation_profiles ?? []) {
    for (const id of [
      ...(profile.mastered ?? []),
      ...(profile.emerging ?? []),
      ...(profile.blocked_or_deferred ?? []),
      ...(profile.expected_frontier ?? []),
    ]) {
      referencedIds.add(id)
    }
  }

  for (const id of referencedIds) {
    if (!skillById.has(id)) {
      skillById.set(id, placeholderSkill(id))
    }
  }

  const activityById = new Map<string, ActivityTemplate>()
  for (const activity of [...defaultActivities(), ...(source.activities ?? [])]) {
    activityById.set(activity.id, activity)
  }

  return {
    ...source,
    skills: [...skillById.values()],
    activities: [...activityById.values()],
  }
}

function hard(skill_id: string, min_state = 'introduced', rationale = 'Required for coherent next step.'): Prerequisite {
  return { skill_id, min_state: min_state as Prerequisite['min_state'], rationale }
}

function placeholderSkill(id: string): SkillNode {
  const spec = placeholderSpecs[id] ?? inferPlaceholderSpec(id)
  return {
    id,
    version: 1,
    title: spec.title,
    domain: spec.domain,
    track: spec.track,
    age_band: spec.age_band,
    description: spec.description,
    developmental_goal: spec.goal,
    examples: spec.examples,
    prerequisites: {
      hard: spec.hard,
      soft: spec.soft ?? [],
      anti_prerequisites: [],
    },
    related_skills: {
      supports: spec.supports ?? [],
      co_practice: [],
      transfer_to: [],
      contrasts_with: [],
      not_a_prerequisite: spec.notPrerequisite ?? [],
    },
    probes: [],
    activities: [],
    difficulty_knobs: [],
    mastery: {
      transition_rules: {
        generalizing: 'Shows the skill beyond a single app layout.',
        mastered: 'Shows low-prompt, spaced, multi-context evidence.',
      },
      evidence_requirements: rawContent.mastery_defaults.evidence_requirements,
      recheck_interval_days: rawContent.mastery_defaults.recheck_interval_days,
    },
    evidence_notes: {
      source_families: ['SPEC'],
      rationale: spec.rationale,
      assumptions: ['Placeholder node expanded from SKILL_SCHEMA.yaml placeholder_skill_ids_for_mvp.'],
      do_not_drill: spec.doNotDrill ?? [],
      contraindications: spec.contraindications ?? [],
    },
  }
}

interface PlaceholderSpec {
  title: string
  domain: string
  track: string
  age_band: string
  description: string
  goal: string
  examples: string[]
  hard: Prerequisite[]
  soft?: Prerequisite[]
  supports?: string[]
  notPrerequisite?: string[]
  rationale: string
  doNotDrill?: string[]
  contraindications?: string[]
}

const placeholderSpecs: Record<string, PlaceholderSpec> = {
  'vocab.familiar_people.v1': basicSpec(
    'Familiar people',
    'vocabulary',
    [hard('engagement.shared_attention.v1')],
    ['mom', 'dad', 'grandma'],
  ),
  'vocab.body_parts.v1': basicSpec('Body parts', 'vocabulary', [hard('engagement.shared_attention.v1')], [
    'nose',
    'hands',
    'feet',
  ]),
  'vocab.foods.v1': basicSpec('Foods', 'vocabulary', [hard('vocab.familiar_nouns.v1', 'emerging_receptive')], [
    'apple',
    'banana',
    'cracker',
  ]),
  'vocab.clothing.v1': basicSpec('Clothing', 'vocabulary', [hard('vocab.familiar_nouns.v1', 'emerging_receptive')], [
    'shoe',
    'hat',
    'coat',
  ]),
  'vocab.verbs.object_actions.v1': basicSpec(
    'Object action verbs',
    'semantics',
    [hard('vocab.verbs.common_actions.v1', 'introduced')],
    ['open', 'close', 'wash'],
  ),
  'concept.attributes.basic.v1': basicSpec(
    'Basic attributes',
    'concepts',
    [hard('vocab.familiar_nouns.v1', 'emerging_receptive')],
    ['big', 'little', 'wet'],
  ),
  'concept.color_as_descriptor.v1': basicSpec(
    'Color as descriptor',
    'concepts',
    [hard('concept.attributes.basic.v1', 'introduced')],
    ['red cup', 'blue car'],
  ),
  'concept.categories.basic.v1': basicSpec(
    'Basic categories',
    'semantics',
    [hard('vocab.familiar_nouns.v1', 'emerging_receptive')],
    ['food', 'animal', 'clothes'],
  ),
  'concept.functions.basic.v1': basicSpec(
    'Object functions',
    'semantics',
    [hard('concept.categories.basic.v1', 'introduced')],
    ['eat it', 'wear it', 'ride it'],
  ),
  'concept.prepositions.behind_next_to.v1': basicSpec(
    'Behind and next to',
    'concepts',
    [hard('concept.prepositions.in_on_under.v1', 'generalizing')],
    ['behind chair', 'next to box'],
  ),
  'receptive.two_step_related.v1': basicSpec(
    'Two-step related directions',
    'receptive_language',
    [hard('receptive.one_step.v1', 'generalizing')],
    ['get shoes and bring them here'],
  ),
  'receptive.two_step_unrelated.v1': basicSpec(
    'Two-step unrelated directions',
    'receptive_language',
    [hard('receptive.two_step_related.v1', 'generalizing')],
    ['touch cup then find bear'],
  ),
  'questions.what_object.v1': basicSpec(
    'What object questions',
    'questions',
    [hard('vocab.familiar_nouns.v1', 'emerging_receptive')],
    ['what is this'],
  ),
  'questions.what_action.v1': basicSpec(
    'What action questions',
    'questions',
    [hard('vocab.verbs.common_actions.v1', 'emerging_receptive')],
    ['what is daddy doing'],
  ),
  'questions.who.v1': basicSpec('Who questions', 'questions', [hard('vocab.familiar_people.v1', 'emerging_receptive')], [
    'who is eating',
  ]),
  'questions.which_choice.v1': basicSpec(
    'Which choice questions',
    'questions',
    [hard('concept.attributes.basic.v1', 'introduced')],
    ['which one is big'],
  ),
  'questions.why_because_seed.v1': basicSpec(
    'Why and because seeds',
    'questions',
    [hard('vocab.verbs.common_actions.v1', 'emerging_receptive')],
    ['because cold', 'because rain'],
  ),
  'expressive.two_word_combo.v1': basicSpec(
    'Two-word combinations',
    'expressive_language',
    [hard('vocab.familiar_nouns.v1', 'emerging_receptive')],
    ['more milk', 'daddy go'],
  ),
  'narrative.first_then.v1': basicSpec(
    'First and then sequence',
    'narrative',
    [hard('narrative.picture_event_seed.v1', 'generalizing')],
    ['first park then snack'],
  ),
  'soundplay.environmental_sounds.v1': basicSpec(
    'Environmental sounds',
    'sound_play',
    [hard('engagement.shared_attention.v1')],
    ['dog bark', 'water splash'],
  ),
  'soundplay.syllable_beats.v1': basicSpec(
    'Syllable beats',
    'sound_play',
    [hard('soundplay.rhyme_exposure.v1', 'introduced')],
    ['ba-na-na', 'di-no-saur'],
  ),
  'soundplay.rhyme_recognition.v1': basicSpec(
    'Rhyme recognition',
    'sound_play',
    [hard('soundplay.rhyme_exposure.v1', 'generalizing')],
    ['cat hat'],
  ),
  'soundplay.beginning_sound_noticing.v1': basicSpec(
    'Beginning sound noticing',
    'sound_play',
    [hard('soundplay.rhyme_recognition.v1', 'generalizing'), hard('soundplay.syllable_beats.v1', 'generalizing')],
    ['mama and moon start the same'],
  ),
  'print.book_handling.v1': basicSpec('Book handling', 'early_literacy', [hard('engagement.shared_attention.v1')], [
    'turn page',
    'point in book',
  ]),
  'print.letter_names.v1': {
    ...basicSpec('Letter names', 'early_literacy', [hard('print.environmental_print.v1', 'introduced')], ['M', 'T']),
    notPrerequisite: ['phonics.simple_decoding.v1'],
    doNotDrill: ['Do not treat letter naming as reading.'],
  },
  'print.letter_sound_links.v1': basicSpec(
    'Letter-sound links',
    'early_literacy',
    [hard('print.letter_names.v1', 'generalizing'), hard('soundplay.beginning_sound_noticing.v1', 'generalizing')],
    ['M says /m/'],
  ),
  'phonological.phoneme_awareness.v1': basicSpec(
    'Oral phoneme awareness',
    'phonological_awareness',
    [hard('soundplay.beginning_sound_noticing.v1', 'generalizing')],
    ['hear first sound'],
  ),
  'phonics.simple_decoding.v1': {
    ...basicSpec(
      'Simple decoding',
      'phonics',
      [hard('phonological.phoneme_awareness.v1', 'generalizing'), hard('print.letter_sound_links.v1', 'generalizing')],
      ['read simple CVC word'],
    ),
    age_band: '4-6',
    doNotDrill: ['Do not unlock from letter names alone.', 'Do not drill decoding in the toddler MVP.'],
    contraindications: ['Deferred for the initial MVP.'],
  },
  'real_world.object_find.v1': basicSpec(
    'Real-world object find',
    'generalization',
    [hard('vocab.familiar_nouns.v1', 'independent_in_activity')],
    ['find real spoon', 'find shoe in room'],
  ),
}

function basicSpec(title: string, domain: string, prereqs: Prerequisite[], examples: string[]): PlaceholderSpec {
  return {
    title,
    domain,
    track: domain,
    age_band: '2-5',
    description: `${title} skill node for the MVP graph.`,
    goal: `Support ${title.toLowerCase()} through parent-guided play and real-world generalization.`,
    examples,
    hard: prereqs,
    rationale: `${title} is part of the extensible atlas graph.`,
  }
}

function inferPlaceholderSpec(id: string): PlaceholderSpec {
  const title = id.replace(/\.v1$/, '').split('.').slice(1).join(' ').replace(/_/g, ' ')
  return basicSpec(title, id.split('.')[0], [], [title])
}

function defaultActivities(): ActivityTemplate[] {
  const baseRules = {
    min_items: 2,
    max_items: 8,
    stop_on_frustration: true,
    no_timers: true,
    no_streaks: true,
  }
  return [
    activity('act.action_match.v1', 'Action Match', 'photo_choice', ['vocab.verbs.common_actions.v1'], [
      'questions.what_action.v1',
    ]),
    activity('act.find_the_feature.v1', 'Find the Feature', 'photo_choice', ['concept.attributes.basic.v1'], [
      'questions.which_choice.v1',
    ]),
    activity('act.question_picnic.v1', 'Question Picnic', 'photo_question', ['questions.where.v1'], [
      'questions.who.v1',
      'questions.what_action.v1',
    ]),
    activity('act.tiny_treasure_hunt.v1', 'Tiny Treasure Hunt', 'parent_led_direction', ['receptive.one_step.v1'], [
      'receptive.two_step_related.v1',
      'real_world.object_find.v1',
    ]),
    activity('act.sound_play_parade.v1', 'Sound Play Parade', 'parent_led_sound_play', ['soundplay.rhyme_exposure.v1'], [
      'soundplay.syllable_beats.v1',
      'soundplay.beginning_sound_noticing.v1',
    ]),
    activity('act.print_spotting.v1', 'Print Spotting', 'parent_led_print_walk', ['print.environmental_print.v1'], [
      'print.letter_names.v1',
    ]),
    activity('act.silly_mix_up.v1', 'Silly Mix-Up', 'parent_led_silly_error', ['concept.categories.basic.v1'], [
      'questions.which_choice.v1',
    ]),
    activity('act.why_because_seed.v1', 'Why/Because Seeds', 'parent_led_question', ['questions.why_because_seed.v1'], [
      'narrative.picture_event_seed.v1',
    ]),
  ]

  function activity(
    id: string,
    title: string,
    activity_type: string,
    primary: string[],
    secondary: string[],
  ): ActivityTemplate {
    return {
      id,
      title,
      activity_type,
      target_skill_ids: { primary, secondary },
      child_ui: {
        max_choices: activity_type === 'photo_choice' ? 4 : 0,
        uses_text: false,
        uses_parent_voice: true,
        feedback_style: 'parent_led',
      },
      required_assets: [],
      session_rules: baseRules,
    }
  }
}

export const content = normalizeContent(rawContent)
