# First Goal Prompt

Paste this into Codex as the first `/goal`.

```text
/goal Create a research + product + architecture spec for Toddler Language Atlas, using the full context in /Users/ts/Documents/toddler-language-atlas/PROJECT_CONTEXT.md. Do not implement the app yet.

Use parallel subagents where useful:
1. Child language development research
2. Skill-map / curriculum architecture
3. Toddler game/product design
4. Software/data architecture

Wait for all subagents, then synthesize one coherent spec.

The spec must include: product vision; ages ~2-5 language-skill DAG; initial skill nodes for my 2-year-3-month-old son's likely frontier; JSON/YAML schema for skills/prereqs/probes/activities/difficulty/mastery/evidence; toddler-appropriate mastery model; adaptive frontier-selection algorithm; 8-12 initial games or activities; parent workflow; small first playable MVP scope; roadmap into phonological awareness, alphabet knowledge, phonics, decoding, storytelling, and early reading.

Also include learner-progression simulations for 4-6 profiles that stress-test whether the map and recommendation logic produce coherent next steps. Include profiles for age-typical uneven vocabulary, verbally advanced but weaker directions/prepositions, strong receptive but limited expressive speech, screen-only success without generalization, early letter knowledge with weaker oral language/phonological awareness, and older preschool readiness for rhyme/syllables/beginning sounds.

Constraints: not diagnostic or therapeutic; no early academic drilling; no pronunciation pressure; child UI stays simple; prefer real photos, parent voice, shared attention, short sessions, and off-screen generalization. Separate evidence-backed claims, product assumptions, and open questions. Cite credible sources.

Done when the written spec can guide implementation, the schema is concrete, the MVP is buildable, the map is extensible beyond age 2, and the simulations show coherent prerequisite-aware next-step recommendations.
```
