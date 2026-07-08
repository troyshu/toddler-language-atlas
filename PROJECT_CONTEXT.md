# Toddler Language Atlas - Project Context

## Product Vision

Toddler Language Atlas is a parent-guided language-learning web app for a 2-year-3-month-old child, designed to grow into later preschool language, early literacy, phonological awareness, phonics, and reading skills.

The child-facing experience should feel like very simple play: real photos, parent voice, large choices, short sessions, and no visible testing pressure. The sophistication belongs in the parent-facing skill map, adaptiveness, mastery model, and progress review.

This is not a diagnostic, therapeutic, or clinical tool. It should not pressure pronunciation, drill articulation, or push formal reading before the child is developmentally ready.

## Core Design Principle

Skill map != games.

The language atlas should be a durable, extensible graph of skills. Games, probes, parent observations, and real-world activities attach to skill nodes. That way the app can start with toddler oral language and later extend into phonological awareness, alphabet knowledge, phonics, decoding, story comprehension, spelling, and early reading without rewriting the system.

## Target Learner

Initial target: a 2-year-3-month-old child who may already be capable in many age-level language tasks, but whose breadth, abstraction, generalization, and next developmental frontier are unclear.

The system should support advanced development without assuming early academic drilling is beneficial. It should detect strengths and unevenness across domains.

## Evidence-Informed Assumptions

- At age 2-3, high-ROI language work is likely oral language, receptive comprehension, vocabulary breadth, verbs, attributes, categories, directions, question answering, story seeds, and sound play.
- Early literacy begins before reading, but formal reading instruction for infants and toddlers is not the goal.
- Phonological awareness precedes phonics. Broad sound play, rhymes, syllables, and beginning-sound noticing should come before phoneme-level manipulation and letter-sound decoding.
- Speech-sound production is not the same as speech-sound awareness. Later-developing sounds such as /s/, /r/, /th/, and clusters should not be drilled as a prerequisite for language learning.
- Screen-only performance is incomplete evidence. Mastery should include generalization across context, materials, days, and parent observations.

Useful source families to consult and cite in the spec:

- CDC developmental milestones
- ASHA communication milestones and speech/language guidance
- NIDCD speech and language milestones
- Zero to Three early literacy and language guidance
- NAEYC early literacy and phonological awareness guidance
- National Early Literacy Panel / NICHD early literacy predictors
- AAP / HealthyChildren digital media guidance

## Required Spec Deliverables

The first goal should produce a research + product + architecture specification, not a full app implementation.

The spec should include:

1. Product vision for Toddler Language Atlas.
2. A language-development skill map for ages about 2-5, organized as a DAG or DAG-like hierarchy.
3. Initial skill nodes for the child current likely zone:
   - vocabulary breadth
   - receptive language
   - verbs
   - attributes
   - categories
   - prepositions
   - one-step and two-step directions
   - who/what/where/which questions
   - early why/because seeds where appropriate
   - narrative seeds
   - sound play
   - early print awareness
4. A structured schema in JSON or YAML for:
   - skill id
   - domain
   - description
   - prerequisites
   - related skills
   - probes
   - activities
   - difficulty knobs
   - prompting levels
   - mastery states
   - evidence notes
   - contraindications / do-not-drill notes
5. A toddler-appropriate mastery model:
   - noisy observations
   - multiple contexts
   - parent prompting levels
   - spaced re-checks
   - real-world generalization
   - regression / stale-skill handling
6. An adaptive frontier-selection algorithm:
   - select skills with prerequisites mostly satisfied
   - avoid too-easy and too-hard work
   - balance breadth across domains
   - avoid over-drilling one category
   - preserve engagement
   - surface off-screen practice
7. Eight to twelve initial games or activity types mapped to skill nodes and difficulty knobs.
8. Parent workflow:
   - add real photos
   - record prompts
   - run 3-10 minute sessions
   - log real-world observations
   - review progress
   - choose or accept recommended next activities
9. First playable MVP scope small enough to build next.
10. Roadmap for later phonological awareness, alphabet knowledge, phonics, decoding, storytelling, and early reading.
11. Learner-progression simulations that stress-test the map, prerequisites, mastery model, and next-step logic.

## Simulation Requirements

The spec should define and conceptually run 4-6 simulated learner profiles through the skill map. Each walkthrough should show current state, mastered skills, emerging skills, blocked skills, selected frontier skills, recommended activities, re-checks, and next steps.

Include at least these profiles:

1. Age-typical 2-year-old with uneven vocabulary breadth.
2. Verbally advanced toddler with strong vocabulary but weaker directions/prepositions.
3. Child with strong receptive language but limited expressive speech.
4. Child who performs well in-game but fails to generalize off-screen.
5. Child who knows many letters early but has weaker oral language or phonological awareness.
6. Older preschool learner ready for rhyme, syllables, beginning sounds, and early letter-sound links.

Simulation checks:

- The system should not recommend phonics too early just because the child knows letters.
- The system should not over-practice nouns while ignoring verbs, relations, directions, questions, and narrative.
- The system should treat screen-only success as incomplete mastery.
- The system should find coherent next steps when one branch is blocked or uneven.
- The system should avoid impossible jumps, such as phoneme-level work before broader sound play.
- The system should keep advanced learners moving without turning the experience into drilling.

## Subagent Plan

Use subagents for the planning/research/specification phase where possible:

1. Child language development research agent:
   - Identify evidence-informed domains from ages 2-5.
   - Flag what is age-appropriate, what is too early, and what should not be drilled.
   - Cite credible sources.
2. Skill-map / curriculum architecture agent:
   - Turn domains into a prerequisite-aware DAG.
   - Define frontier-skill logic and mastery states.
   - Identify parallel tracks and cross-links.
3. Toddler game/product design agent:
   - Propose parent-guided game loops.
   - Keep child-facing UI simple and low-pressure.
   - Map games to skills and difficulty knobs.
4. Software/data architecture agent:
   - Design extensible schema and app architecture.
   - Keep content, skills, games, learner state, and recommendation logic separable.
   - Prepare for future skills without hardcoding age 2.

The main agent should wait for all subagents, compare outputs, resolve conflicts, and synthesize one coherent spec.

## Definition of Done

The goal is complete when:

- There is a coherent written spec that can guide implementation.
- The skill map is extensible and not hardcoded to age 2.
- The MVP is clearly scoped and buildable.
- The schema is concrete enough that the next goal can be "build the MVP from this spec."
- The recommendations are developmentally appropriate for a 2-year-old while leaving room to detect and support advanced skills.
- The spec includes simulated learner walkthroughs showing that the skill map, prerequisites, mastery rules, and adaptive frontier selection produce coherent next-step recommendations for different child profiles.
- Evidence-backed claims, reasonable product assumptions, and open questions are separated.
