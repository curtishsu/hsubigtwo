End Game Winner Reveal — Product Experience Spec (v2)
Goal

Create a suspenseful, time-based end-game reveal for a fixed 4-player Big Two game. The reveal progresses from 4th place → 1st place, using a consistent hero spotlight. The final state clearly communicates the winner and final placements without requiring replay.

High-Level Experience Principles

Build suspense by revealing last place first

Every placement is briefly treated as the “hero” to maintain narrative tension

Make 1st place unmistakable

Preserve dignity for all players

Optimize for repeated nightly viewing

Avoid over-animation or UI clutter

Final Resting Layout (Settled State)
Layout Anchors

Hero (1st place):

Centered horizontally

Slightly above vertical center

Largest card size (hero)

Bottom Row (2nd–4th):

Three fixed slots: left, center, right

Positioned above bottom navigation bar with safe padding

Mapping:

2nd → bottom-left

3rd → bottom-center

4th → bottom-right

Persistent UI

Bottom navigation tabs remain visible and usable

No explicit “Back” or “Home” button

No additional skip buttons (tap anywhere behavior only)

Player Card Component (Reusable)

Each placement reveal uses the same PlayerCard pattern.

Fields

avatar (single consistent image per player; no emotion variants)

displayName (e.g. Curtis, Mommy, Darwin, Daddy)

pointsText (formatted as: “{points} points”)

placementBadge (e.g. “4th”, “3rd”, “2nd”, “1st”)

size:

hero

mini

state:

entering

hero

minimizing

docked

Visual Rules

All placements (4th → 1st) start in the hero slot

Placement badge only appears once card is docked

Points are always visible

Name always appears directly under avatar

Crown icon allowed only for 1st place in final state

Timeline / Phase-Based Reveal
Phase 0 — Intro

Screen mounts

No PlayerCards visible

Placement banner hidden

Phase 1 — Reveal 4th Place

Placement banner appears: “4th Place”

4th place PlayerCard:

Enters into the hero slot

Size = hero

After short pause:

Card shrinks to mini

Slides to bottom-right slot

“4th” placement badge appears

Phase 2 — Reveal 3rd Place

Placement banner updates: “3rd Place”

3rd place PlayerCard:

Enters into the hero slot

Size = hero

After short pause:

Card shrinks to mini

Slides to bottom-center slot

“3rd” placement badge appears

Phase 3 — Reveal 2nd Place

Placement banner updates: “2nd Place”

2nd place PlayerCard:

Enters into the hero slot

Size = hero

After short pause:

Card shrinks to mini

Slides to bottom-left slot

“2nd” placement badge appears

Phase 4 — Reveal 1st Place (Winner)

Placement banner updates: “👑 First Place 👑”

Winner PlayerCard:

Enters into the hero slot

Size = hero

Remains centered (does not dock)

Points subtitle visible

Phase 5 — Celebration

Light emoji/confetti burst appears:

Positioned left and right of the placement banner

Does not overlap avatars or text

Emoji-style particles (e.g. 🎉 👑)

Brief duration, then fade out

Layout transitions naturally into settled state

Phase 6 — Settled State

Winner remains centered in hero position

Bottom row shows 2nd / 3rd / 4th with placement badges and points

No looping animations

Screen remains static until navigation

Interaction Rules
Skip Behavior (Tap Anywhere)

User may tap anywhere on screen to skip

No visible skip button

Skip behavior definition:

Tap immediately advances to the next phase, not directly to settled state

Repeated taps continue advancing phase-by-phase

Final phase still reaches settled state naturally

Navigation Behavior

No explicit exit controls

User exits via bottom navigation tabs

If user navigates away and returns:

Show settled state

Do not auto-replay animation

Tie Handling
Rule

If multiple players are tied for a placement:

Display placement as: “2nd (tie)”, “3rd (tie)”, etc.

Order tied players randomly within their placement group

Ties do not change the animation structure

Motion & Timing Constraints (Guidance)

Only the currently revealed card animates prominently

Docked cards remain static

Use a single easing style throughout

Entire sequence should feel complete within ~6–8 seconds if uninterrupted

Avoid exaggerated bounce or physics

Copy & Text Rules

Points format: “{points} points”

Placement banner text:

“4th Place”

“3rd Place”

“2nd Place”

“👑 First Place 👑”

Player names must exactly match provided displayName

Avoid text truncation unless explicitly required

Acceptance Criteria

Every placement is briefly shown as the hero

Winner is unmistakable in final state

Rank is never inferred from position alone

Skip interaction is intuitive and responsive

Bottom row does not overlap navigation bar

Confetti does not obscure avatars or text

Final state is readable and stable

Non-Goals

Backend logic

Analytics

Settings UI

Emotion-based avatars

END OF SPEC