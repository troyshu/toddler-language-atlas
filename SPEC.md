# Toddler Language Atlas Spec

Status: first research + product + architecture specification  
Target child: 2 years, 3 months  
Scope: design and specification only; no app implementation

## 1. Product Vision

Toddler Language Atlas is a parent-guided language learning web app that maps a child's language and early-literacy development as an extensible skill graph. The app recommends short, playful, parent-mediated activities from the child's current frontier, records noisy evidence over time, and distinguishes screen performance from real-world generalization.

The child-facing surface should feel almost simple: real photos, parent voice, large targets, short sessions, and no visible scoring. The parent-facing surface is where the sophistication lives: skill graph, evidence, mastery states, recommendations, and progress review.

The product is not diagnostic, therapeutic, or clinical. It should never pressure pronunciation, score articulation, or push formal reading. If the parent has concerns about hearing, language regression, broad milestone gaps, or intelligibility, the app should recommend discussing those concerns with the child's pediatrician or a speech-language professional rather than trying to diagnose.

## 2. Evidence Base

### Evidence-backed claims

- Around age 2, mainstream developmental guidance emphasizes pointing in books, two-word combinations, body-part knowledge, gestures, object use, and play, not formal reading. CDC's 2-year milestones include pointing to things in a book, two-word phrases, body parts, and gestures.
- NIDCD's 2-3 year language checklist emphasizes having words for many things, 2-3 word phrases, naming objects to request or direct attention, and being understood by family and friends.
- ASHA's 2-3 year communication milestones include word combinations, attention-getting, name response, plural words, `-ing` verbs, giving reasons, asking why/how, answering functional questions, and clearer but still developing speech. ASHA also recommends expanding what the child says, teaching new words in context, grouping objects by category, using family photos, offering choices, songs, finger games, and nursery rhymes.
- Early literacy begins before conventional reading, but Zero to Three explicitly separates early literacy from formal early reading instruction for infants and toddlers.
- Phonological awareness includes rhyming, alliteration, sentence segmentation, syllables, onset-rime, and phonemic awareness. NAEYC frames these as playful preschool skills that can be embedded in movement, songs, books, and daily activities.
- The National Early Literacy Panel identified alphabet knowledge, phonological awareness and memory, rapid naming, and writing letters as strong predictors of later literacy, but those predictors should be understood as later early-literacy targets, not a mandate to drill a 2-year-old.
- AAP/HealthyChildren guidance for toddlers and preschoolers emphasizes quality, context, communication, avoiding crowding out play/books/movement/family interaction, and turning off manipulative media features such as autoplay.
- Speech-sound production is separate from language comprehension and phonological awareness. Later-developing speech sounds should not be a gate for language learning, and unclear articulation should not be treated as lack of word knowledge.

### Product assumptions

- The best first frontier for this child is likely not isolated phonics, but breadth and flexibility across oral language: vocabulary, verbs, attributes, categories, relations, questions, directions, narrative seeds, sound play, and early print awareness.
- Mastery should be probabilistic and evidence-based. A child can be reliable in a photo-choice game while not yet generalizing the concept to real objects, different rooms, different people, or later days.
- Age bands should be hints, not locks. A gifted or advanced child can explore ahead, but prerequisites and evidence quality should prevent brittle jumps into inappropriate drilling.
- The child should not see the skill map or progress pressure. The parent sees the atlas; the child experiences play.

### Open questions

- How much observation should the app ask from the parent before recommendations feel burdensome?
- How should the app handle bilingual or multilingual development in a later version?
- Should the initial MVP store data only locally, or provide optional sync later?
- How much should the app personalize using parent-entered priorities versus graph-driven recommendations?
- What future evidence threshold should unlock phonics: phonological awareness, letter interest, print awareness, or a combination?

## 3. Development Map

The atlas should use a DAG for hard prerequisite edges and separate non-gating cross-links for transfer and co-practice. Ages are advisory bands. A skill can be explored if prerequisites are sufficiently present, even if the age band is older; it should not be drilled if the prerequisite evidence is weak.

### Tracks

1. Engagement and shared attention
   - joint attention with adult
   - choice making
   - turn-taking
   - tolerance for short parent-guided activities

2. Vocabulary and semantics
   - familiar nouns
   - people, body, foods, clothing, toys, vehicles, animals, rooms
   - verbs and actions
   - attributes
   - categories
   - functions
   - opposites
   - same/different
   - relational vocabulary

3. Receptive language and directions
   - object identification
   - one-step directions
   - two-step related directions
   - two-step unrelated directions
   - spatial directions
   - temporal directions
   - conditional directions

4. Relations and concepts
   - in, on, under
   - off, out, behind, next to, between
   - big/little, hot/cold, wet/dry, clean/dirty, loud/quiet
   - more/all gone, one/many
   - part/whole
   - first/then/last

5. Questions and conversation
   - yes/no
   - what
   - who
   - where
   - which
   - early why/because
   - prediction
   - preference explanation
   - conversational repair and turn extension

6. Expressive language and grammar
   - single-word labels
   - two-word combinations
   - agent-action phrases
   - action-object phrases
   - descriptor-noun phrases
   - prepositional phrases
   - pronouns
   - plurals
   - tense/aspect seeds
   - conjunctions such as `and`, `because`, `but`

7. Narrative and story
   - picture description
   - personal event recall
   - who/action/place
   - first/then sequence
   - problem/solution seeds
   - retell familiar story
   - causal narrative

8. Sound play and phonological awareness
   - listening and environmental sounds
   - animal sounds and silly sounds without articulation pressure
   - songs and nursery rhymes
   - rhyme exposure
   - rhyme recognition
   - syllable clapping
   - alliteration and beginning-sound noticing
   - onset-rime
   - phoneme awareness later

9. Print and early literacy
   - book handling
   - page turning
   - pictures carry meaning
   - print carries meaning
   - environmental print
   - name recognition
   - letter-name interest
   - letter-sound links
   - decoding

## 4. DAG Shape

The graph should enforce these broad dependency patterns:

```text
shared_attention
  -> receptive.object_identification
  -> receptive.one_step_directions
  -> receptive.two_step_related
  -> receptive.two_step_unrelated

vocab.familiar_nouns
  -> vocab.categories.basic
  -> vocab.functions.basic
  -> questions.which_choice

vocab.verbs.common_actions
  -> questions.what_action
  -> narrative.picture_event_seed
  -> expressive.agent_action_object

concept.prepositions.in_on_under
  -> questions.where
  -> receptive.spatial_directions
  -> narrative.setting

questions.who + questions.what + questions.where
  -> narrative.picture_description
  -> narrative.first_then
  -> narrative.personal_event_recall

soundplay.environmental_sounds
  -> soundplay.rhyme_exposure
  -> soundplay.rhyme_recognition
  -> soundplay.syllable_clapping
  -> soundplay.beginning_sound_noticing
  -> phonological.onset_rime
  -> phonological.phoneme_awareness

print.book_handling
  -> print.pictures_and_story_meaning
  -> print.environmental_print
  -> print.name_recognition
  -> print.letter_names

phonological.phoneme_awareness + print.letter_sound_links
  -> phonics.simple_decoding
```

Critical rule: `print.letter_names` must not unlock `phonics.simple_decoding` by itself. Early letter knowledge is useful, but phonics needs oral sound-awareness readiness and letter-sound links.

## 5. Initial Skill Nodes

These are the first-pass skill nodes for the likely 2-year-3-month frontier. The MVP should start with about 24-30 nodes, with these as the spine.

| Skill ID | Domain | Hard prerequisites | Useful evidence | Unlocks or supports |
|---|---|---|---|---|
| `engagement.shared_attention` | engagement | none | attends to parent prompt, points/taps/acts | all parent-guided work |
| `vocab.familiar_people` | vocabulary | shared attention | identifies family photos | who questions, story characters |
| `vocab.familiar_nouns` | vocabulary | shared attention | identifies objects/photos across rooms | categories, what questions |
| `vocab.body_parts` | vocabulary | shared attention | points to body parts | directions, self-care language |
| `vocab.foods` | vocabulary | familiar nouns | identifies foods at snack and in photos | categories, functions |
| `vocab.clothing` | vocabulary | familiar nouns | identifies shoes/hat/coat/shirt | functions, which questions |
| `vocab.verbs.common_actions` | semantics | familiar nouns | understands eating/running/sleeping/washing | directions, narrative |
| `vocab.verbs.object_actions` | semantics | common verbs | understands open/close/wash/throw/fix | two-step directions |
| `concept.attributes.basic` | concepts | familiar nouns | big/little, hot/cold, wet/dry | which, compare/contrast |
| `concept.color_as_descriptor` | concepts | familiar nouns | finds red cup among cups | descriptor-noun phrases |
| `concept.categories.basic` | semantics | noun breadth | sorts food/animals/clothes | functions, which |
| `concept.functions.basic` | semantics | categories | answers "what do you wear/eat?" | functional questions |
| `concept.prepositions.in_on_under` | relations | object ID, one-step attention | follows/finds in/on/under | where, spatial directions |
| `concept.prepositions.behind_next_to` | relations | in/on/under reliable | follows/finds behind/next to | expanded spatial language |
| `receptive.one_step` | receptive | familiar nouns and verbs | follows "get the ball" | two-step related |
| `receptive.two_step_related` | receptive | one-step reliable | "get shoes and bring them here" | sequencing |
| `receptive.two_step_unrelated` | receptive | two-step related | "touch cup then find bear" | memory, classroom directions |
| `questions.what_object` | questions | familiar nouns | answers/chooses object | picture description |
| `questions.what_action` | questions | common verbs | answers "what is he doing?" | narrative actions |
| `questions.who` | questions | people/characters | identifies person/character | story characters |
| `questions.where` | questions | places/prepositions | answers/chooses location | setting |
| `questions.which_choice` | questions | attributes/categories | chooses based on feature/function | decision language |
| `questions.why_because_seed` | questions | verbs, simple events | accepts/models "because" in routine | causal narrative |
| `expressive.two_word_combo` | expressive | words for wants/actions | spontaneous or modeled 2-word use | grammar expansion |
| `narrative.picture_event_seed` | narrative | who/what/where, verbs | describes photo event with support | first/then |
| `narrative.first_then` | narrative | two-step related, event seed | orders two photos | story sequencing |
| `soundplay.environmental_sounds` | sound play | listening engagement | matches dog/bell/water sound | rhyme exposure |
| `soundplay.rhyme_exposure` | sound play | songs/rhymes interest | enjoys repeated rhymes | rhyme recognition |
| `soundplay.syllable_beats` | sound play | word play interest | claps names/banana with support | larger sound awareness |
| `print.book_handling` | print | shared book attention | turns pages, points | story comprehension |
| `print.environmental_print` | print | print carries meaning | recognizes STOP/logo/name | letter interest later |

## 6. Mastery Model

Mastery is stateful and probabilistic. The app should not report "mastered" from one clean session.

### Skill states

- `not_seen`: no usable evidence
- `introduced`: exposed with parent support
- `emerging_receptive`: receptive signs with moderate/high prompting
- `emerging_expressive`: expressive signs with moderate/high prompting
- `assisted_success`: succeeds with repeated prompt, gesture, binary choice, or model
- `independent_in_activity`: succeeds in app or structured activity with low/no prompt
- `generalizing`: succeeds across more than one context/material/person/day
- `mastered`: stable, low-prompt, multi-context, spaced evidence
- `maintenance_due`: skill was strong but needs spaced recheck
- `stale`: no recent evidence after configured interval
- `regressed`: recent evidence contradicts prior mastery
- `blocked`: repeated frustration or prerequisite gap
- `deferred`: intentionally withheld because not useful or age-appropriate now

### Prompt ladder

- `P0_independent`: no prompt beyond natural activity prompt
- `P1_wait`: parent pauses or gives expectant look
- `P2_repeat`: prompt repeated or emphasized
- `P3_gesture`: parent points, gestures, or narrows attention
- `P4_binary_choice`: parent offers two alternatives
- `P5_model`: parent models answer or action
- `P6_parent_completes`: observation only, no positive mastery credit

### Evidence dimensions

Each observation should store:

- skill id(s)
- source: app probe, parent log, real-world observation, recheck
- response channel: tap, point, action, word, phrase, imitation, parent judgment
- prompt level
- context: app, book, real object, routine, outdoors, other person
- materials: own photo, stock image, real object, toy, book picture
- result: independent, prompted, partial, not yet, refusal/no data
- engagement: high, medium, low, dysregulated
- generalization credit: true/false
- notes

### Mastery transition rule

A skill can enter `mastered` only when all are true:

- at least 5 positive observations
- at least 3 separate days
- at least 2 contexts or material sets
- at least 1 off-screen or real-world observation when the skill is inherently real-world
- prompt floor is `P0_independent`, `P1_wait`, or `P2_repeat`
- no recent pattern of frustration, random tapping, or parent-completed responses
- spaced recheck confirms retention after the initial practice cluster

Screen-only success can move a skill to `independent_in_activity`, not `mastered`.

## 7. Adaptive Frontier Algorithm

The recommendation engine should choose a tiny session plan, not a curriculum assignment.

```text
input:
  skill_graph
  learner_state
  recent_observations
  parent_priorities
  content_assets

steps:
  1. Update skill states from observations, prompt levels, context, and freshness.
  2. Exclude paused, deferred, contraindicated, recently overused, or frustration-linked skills.
  3. For each skill, compute readiness:
       hard prerequisites met or nearly met
       soft prerequisites weighted
       age band advisory only
       sufficient assets available
  4. Score candidates:
       + readiness
       + high uncertainty / diagnostic value
       + moderate mastery gap
       + under-practiced domain bonus
       + parent priority
       + child engagement history
       + generalization gap bonus
       + stale recheck bonus
       - too-hard penalty
       - over-drill penalty
       - same-activity repetition penalty
       - frustration penalty
  5. Build session:
       1 familiar warm-up
       1-2 frontier activities
       1 maintenance or recheck item
       1 off-screen generalization suggestion
  6. If in-app success is high but generalization is low, recommend parent observation
     or real-object play instead of more screen trials.
  7. If a skill is repeatedly hard with high prompts, cool it down and recommend
     a prerequisite, cross-linked support skill, or easier context.
```

Suggested mix:

- 50-60 percent active frontier
- 20-30 percent maintenance/recheck
- 10-20 percent adjacent exploration

## 8. Game and Activity Types

| Activity | Loop | Primary skills | Difficulty knobs |
|---|---|---|---|
| Photo Point | Parent voice asks "Where is the spoon?" Child taps a real photo. | receptive vocabulary, what/which | field size, distractor similarity, familiar vs novel photo |
| Find the Feature | "Find the big cup" or "Which one is wet?" | attributes, descriptors, which | contrast salience, one vs two attributes |
| Action Match | "Who is jumping?" Child taps photo/video or imitates. | verbs, what-action, who | static photo vs clip, common vs less common verbs |
| Put It Somewhere | Parent guides real object placement: "put bear under chair." | prepositions, directions | preposition type, real vs screen, object count |
| Tiny Treasure Hunt | "Get the bear and bring it to me." | one-step/two-step directions | step count, room distance, delay, object familiarity |
| Question Picnic | Family photos: "Who is eating?" "Where is Grandma?" | wh questions, people, verbs | visible vs inferred answer, choice vs open |
| Category Baskets | Sort photos/objects into food, animals, clothes. | categories, vocabulary breadth | number of bins, borderline examples, distractors |
| Silly Mix-Up | Parent says a playful wrong statement: "Shoe on head?" | receptive language, reasoning | absurd vs plausible error, yes/no vs correction |
| Story Snaps | Parent selects 2-4 photos from the day; child helps talk/order them. | narrative seeds, sequencing | number of photos, parent sentence starter |
| Why/Because Seeds | "Why umbrella?" Parent models "because rain." | causal language, because | choice answer vs open, visible vs remembered cause |
| Sound Play Parade | Animal sounds, rhymes, syllable claps, alliteration. | sound play, rhyme, syllables | imitate vs notice, rhyme vs syllable, no phoneme drilling |
| Print Spotting | Find name/logo/STOP/book cover. | print awareness | familiar signs, matching, no decoding requirement |

Child UI rules:

- large images and controls
- no timers, streaks, failure buzzers, ads, autoplay, infinite feed, or manipulative rewards
- one action per screen
- parent controls session flow
- no visible mastery score to the child
- refusal, fatigue, or silliness can be logged as no data, not failure

## 9. Parent Workflow

1. Add assets:
   - real photos of family, toys, foods, rooms, pets, routines, places
   - optional short clips for actions
   - optional parent-recorded prompts
2. Tag assets:
   - object, person, action, place, category, attribute, routine
3. Review recommendations:
   - app proposes 1-3 short activities with rationale
   - parent can swap, skip, or mark "not today"
4. Run session:
   - 3-10 minutes
   - 3-8 prompts total
   - warm familiar item, frontier item, recheck item, real-world follow-up
5. Score lightly:
   - independent
   - with wait/repeat
   - with gesture
   - binary choice
   - modeled
   - not today/no data
6. Log off-screen evidence:
   - "used under during cleanup"
   - "answered where question in book"
   - "named running in park photo"
7. Review progress:
   - domain coverage
   - current frontier
   - generalization gaps
   - stale skills
   - suggested next real-world activities

## 10. Architecture

Use a content-driven architecture. The runtime should not hardcode toddler skills.

Core modules:

- Content Registry: versioned YAML/JSON packages for skills, probes, activities, prompts, knobs, source notes, and contraindications.
- Skill Graph Engine: validates DAG edges, detects cycles in hard prerequisites, resolves related links, and computes frontier eligibility.
- Learner State Store: stores skill states, observations, sessions, assets, preferences, and stale/recheck flags.
- Observation Pipeline: normalizes app events and parent logs into evidence events.
- Recommendation Engine: selects session plans from frontier, maintenance, and generalization needs.
- Activity Runtime: renders child-facing games from activity templates and local assets.
- Parent Console: asset upload/tagging, prompt recording, session setup, observation logging, progress review.
- Authoring/Validation Tools: schema validation, graph integrity checks, missing asset checks, and learner simulation harness.

Suggested local-first MVP stack:

- Web app with local persistence first.
- YAML content authored in repo, compiled to JSON.
- IndexedDB or local SQLite for learner state.
- Media assets stored locally with metadata records.
- No account sync, speech recognition, cloud scoring, or automated pronunciation scoring in MVP.

## 11. Schema

The full starter schema and seed content are in [SKILL_SCHEMA.yaml](/Users/ts/Documents/toddler-language-atlas/SKILL_SCHEMA.yaml). The schema supports:

- skill nodes
- prerequisites
- related non-gating links
- probes
- activities
- difficulty knobs
- prompting levels
- mastery rules
- evidence notes and contraindications
- learner state
- observations
- recommendation config
- simulated profiles

Canonical authoring format should be YAML. Runtime can compile this into JSON.

## 12. MVP Scope

The first playable MVP should prove the architecture, not the full atlas.

Include:

- 24-30 skill nodes across vocabulary, verbs, attributes, categories, prepositions, directions, questions, narrative seeds, sound play, and print awareness
- 4 activity templates:
  - Photo Point
  - Put It Somewhere
  - Category Baskets
  - Story Snaps
- parent photo upload and basic tagging
- optional parent-recorded audio prompts
- local learner profile
- manual parent scoring
- observation log
- recommendation engine using prerequisites, domain balance, stale checks, and generalization gaps
- parent dashboard with domain coverage, skill states, and next recommended activities
- simulation harness with the six learner profiles below

Exclude:

- phonics instruction
- decoding
- worksheets
- timed drills
- automated speech recognition
- pronunciation scoring
- cloud sync/accounts
- large authoring UI
- social/sharing features

## 13. Learner Progression Simulations

### Profile A: age-typical 2-year-old with uneven vocabulary breadth

Current state:

- knows many household nouns
- weaker food/clothing/vehicle breadth
- follows one-step directions
- enjoys books and photos

Mastered/evidence:

- `engagement.shared_attention`: mastered
- `vocab.familiar_nouns`: generalizing for toys/people
- `receptive.one_step`: independent in routines

Emerging:

- `vocab.foods`
- `vocab.clothing`
- `concept.categories.basic`
- `questions.what_object`

Blocked/deferred:

- phonics and decoding deferred

Recommendation:

- warm-up: Photo Point with favorite toys
- frontier: Category Baskets with food vs clothing using real photos
- recheck: one-step direction with real object
- off-screen: at snack, parent asks "which one can you eat?"

Coherence check:

- The system broadens semantics instead of repeating already-known nouns.
- It does not jump to letters or phonics.

### Profile B: verbally advanced toddler with weaker directions/prepositions

Current state:

- large expressive vocabulary
- uses multiword phrases
- labels many objects and actions
- weaker following of `in/on/under` and two-step directions

Mastered/evidence:

- `vocab.familiar_nouns`: mastered
- `vocab.verbs.common_actions`: generalizing
- `expressive.two_word_combo`: mastered

Emerging:

- `concept.prepositions.in_on_under`
- `receptive.two_step_related`
- `questions.where`

Recommendation:

- warm-up: Action Match with known verbs
- frontier: Put It Somewhere with `in/on/under` using favorite toys
- recheck: one-step direction
- off-screen: cleanup routine, "put car in box, then give me bear"

Coherence check:

- The system does not assume expressive vocabulary means receptive directions are mastered.
- Next steps target relations and action memory.

### Profile C: strong receptive language but limited expressive speech

Current state:

- points accurately
- follows directions
- says fewer words than comprehension suggests
- may be shy or motor-speech output may lag

Mastered/evidence:

- `vocab.familiar_nouns`: generalizing receptively
- `receptive.one_step`: mastered
- `concept.prepositions.in_on_under`: emerging via action

Emerging:

- `expressive.two_word_combo`
- `questions.what_object` expressive answer

Recommendation:

- warm-up: Photo Point, accepted response channels include point/tap
- frontier: choice language, parent models "milk or water"
- activity: Silly Mix-Up where nonverbal correction counts
- off-screen: parent logs spontaneous word/gesture combinations

Coherence check:

- The system does not require speech output where pointing/action demonstrates comprehension.
- It separates expressive evidence from receptive evidence.

### Profile D: screen-only success without generalization

Current state:

- taps correct photo in app
- does not identify same concepts in room or book
- may be pattern matching from familiar screen layouts

Mastered/evidence:

- `vocab.familiar_nouns`: independent_in_activity

Emerging:

- `vocab.familiar_nouns`: generalization weak
- `concept.categories.basic`: app-only

Recommendation:

- no more app trials for the same nouns today
- off-screen observation: find real spoon/cup/shoe in kitchen
- activity: Tiny Treasure Hunt with real objects
- recheck later with different photos or book pictures

Coherence check:

- Screen-only success remains incomplete mastery.
- Recommendation shifts to real-world generalization.

### Profile E: early letter knowledge with weaker oral language or sound awareness

Current state:

- recognizes several letters
- likes alphabet song
- weaker verbs, why/because, categories, and rhyme recognition

Mastered/evidence:

- `print.letter_names`: emerging or independent_in_activity
- `print.environmental_print`: emerging

Emerging:

- `vocab.verbs.common_actions`
- `concept.categories.basic`
- `soundplay.rhyme_exposure`
- `soundplay.syllable_beats`

Blocked/deferred:

- `phonics.simple_decoding`: deferred because `phonological.phoneme_awareness` and `print.letter_sound_links` are not established

Recommendation:

- warm-up: Print Spotting with name/logo
- frontier: Sound Play Parade with rhymes and syllable beats
- semantic frontier: Action Match for verbs
- off-screen: nursery rhyme and action words during play

Coherence check:

- Letter knowledge does not unlock decoding by itself.
- The system uses the interest in print while filling oral-language and sound-play prerequisites.

### Profile F: older preschool learner ready for rhyme, syllables, beginning sounds, and early letter-sound links

Current state:

- age 4-5
- strong oral vocabulary
- answers story questions
- uses simple rhymes
- names some letters

Mastered/evidence:

- `questions.what_action`: mastered
- `narrative.first_then`: generalizing
- `soundplay.rhyme_recognition`: generalizing
- `soundplay.syllable_beats`: generalizing
- `print.letter_names`: generalizing

Emerging:

- `soundplay.beginning_sound_noticing`
- `print.letter_sound_links`
- `phonological.onset_rime`

Recommendation:

- warm-up: rhyme pair recognition
- frontier: beginning-sound noticing with names and familiar objects
- frontier: letter-sound link for 1-2 high-utility letters from child's name
- recheck: story question after shared book

Coherence check:

- The system advances into early phonological awareness and letter-sound links only after oral language, story comprehension, rhyme/syllable play, and letter-name evidence are present.

## 14. Roadmap

### Phase 1: Toddler oral language MVP

- real photo vocabulary
- verbs and actions
- attributes
- categories
- in/on/under
- one-step and two-step related directions
- who/what/where/which
- story seeds
- environmental sounds and songs
- book handling and environmental print

### Phase 2: Broader preschool language

- functions
- compare/contrast
- opposites
- expanded prepositions
- pronouns and plurals
- richer why/because
- personal narrative
- story retell
- conversation turns

### Phase 3: Phonological awareness package

- rhyme recognition
- syllable clapping
- alliteration
- beginning-sound noticing
- onset-rime blending
- oral phoneme awareness, only when ready

### Phase 4: Alphabet and print package

- name recognition
- environmental print
- letter names
- letter formation interest
- letter-sound links

### Phase 5: Phonics and early reading

- simple letter-sound mapping
- oral blending
- CVC decoding
- decodable text
- story comprehension and fluency supports

## 15. Source Notes

- CDC, "Milestones by 2 Years": https://www.cdc.gov/act-early/milestones/2-years.html
- CDC, "Milestones by 3 Years": https://www.cdc.gov/act-early/milestones/3-years.html
- CDC, "Milestones by 4 Years": https://www.cdc.gov/act-early/milestones/4-years.html
- CDC, "Milestones by 5 Years": https://www.cdc.gov/act-early/milestones/5-years.html
- NIDCD/NIH, "Speech and Language Developmental Milestones": https://www.nidcd.nih.gov/health/speech-and-language
- ASHA, "Communication Milestones: 2 to 3 Years": https://www.asha.org/public/developmental-milestones/communication-milestones-2-to-3-years/
- ASHA, "Communication Milestones: Age Ranges": https://www.asha.org/public/developmental-milestones/communication-milestones/
- ASHA, "Speech Sound Disorders-Articulation and Phonology": https://www.asha.org/practice-portal/clinical-topics/articulation-and-phonology/
- Zero to Three, "What We Know About Early Literacy and Language Development": https://www.zerotothree.org/resource/what-we-know-about-early-literacy-and-language-development/
- NAEYC, "Word Play Throughout the Day: Phonological Awareness in the Preschool Classroom": https://www.naeyc.org/resources/pubs/tyc/winter2024/word-play-throughout-the-day
- NICHD/National Early Literacy Panel, "Early Beginnings: Early Literacy Knowledge and Instruction": https://www.nichd.nih.gov/sites/default/files/publications/pubs/documents/NELPEarlyBeginnings09.pdf
- HealthyChildren/AAP, "Helping Kids Thrive in a Digital World": https://www.healthychildren.org/English/family-life/Media/Pages/helping-kids-thrive-in-a-digital-world-AAP-policy-explained.aspx
- HealthyChildren/AAP, "Kids & Screen Time: 5 C's Questions for Toddlers & Preschoolers": https://www.healthychildren.org/English/family-life/Media/Pages/kids-and-screen-time-5-cs-questions-for-toddlers-and-preschoolers.aspx
