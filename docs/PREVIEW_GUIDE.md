# Versioned previews

The original site remains at <https://nyumusedlab.github.io/SpatialAudioNav/>. New previews live under <https://nyumusedlab.github.io/SpatialAudioNav/previews/>. These are development snapshots, not the final public release.

## Start with Preview 06

Open [Listen · Explore · Mix](https://nyumusedlab.github.io/SpatialAudioNav/previews/06-volume-circles/). This is a complete interaction study for **Transition I–II only**.

1. **Listen:** press Play with headphones. Grey circles track speaker volume in the map and both 3D views. Follow amber pulses above the surrounding bed. The pulse tracks measured excess signal, then fades as the accent releases. The recorded shadow plays while the clarinetist is silent.
2. **Explore:** compare Audience, Clarinetist, and Audio engineer without restarting. Open 3D for a dedicated room view with playback still available. Whole room fits all six speakers: tap the floor to move the white listening point and drag to rotate the visual overview. Eye level looks from your listening position; dragging turns your head. Hold the arrows to walk/turn, or use W/A/S/D and J/L. Reset restores the audience position and Whole room; Back or Escape returns to Explore without restarting.
3. **Mix:** hold keys 1–6 or the speaker pads to raise a channel from 50% background to 100% foreground. Latch keeps selections active after release. With no boosts selected, all speakers stay at background level even as the visual guide advances. The recording itself still has loud and quiet gestures. A boost doubles that channel’s signal (+6 dB), not overall perceived loudness. Pads identify Background or Boosted, and the status distinguishes held and latched selections. Multiple speakers can be foregrounded. Release all resets the background. Switching experiences clears manual selections.
4. Compare **Sound timeline** with **Musical score**. Both retain the same playback and your mix. The optional cue guide is the inherited example, distinct from your actual speaker levels. Score zoom/scroll is manual because exact score alignment is unverified.
5. Return to Listen at the same moment, then restart to try again.

The source is `participation.html`, isolated from `index.html`. Preview 06 reuses the existing recording and images and retains Preview 04’s corrected accent automation. The 12 timestamp pairs are attacks and releases: for example, speaker 6 rises at 8.238 s and releases at 8.657 s. The final accent at speaker 4 releases at 56.929 s; the background continues to the end at 76.956 s. Full recording-to-score verification remains outstanding.

## Earlier frozen comparisons

- **05 — Room navigation:** adds the full-screen room with Whole room and Eye level. Preview 06 extends its volume circles into both cameras and clarifies manual mixing.

- **04 — Brief accents:** restored the twelve short speaker boosts and releases. Its embedded 3D view can crop the canvas on high-density displays; Preview 05 fixes the sizing and adds mobile navigation.

- **03 — Participation study:** the first Listen / Explore / Mix interface. A regression incorrectly treated repeated speaker entries as duplicates, keeping accents raised until the next speaker. Preserved for comparison; use Preview 04 for corrected playback.

- **01 — Playback fixes:** the earlier interface with corrected resonance control, playback cancellation, scene cleanup, and playback-time circular panning.
- **02 — Engineer controls:** all four earlier scenes with example/manual ownership, speaker switches, focus handling, role labels, responsive controls, and short listening activities. Try Transition 3–4 and Strophe V for spatial panning and resonance. Its score following remains approximate.

## Next release steps

1. Identify the recording/version and confirm the cue map, especially the final stationary passage in Transition III–IV. Establish the wet recording's contents and intended audible resonance location.
2. Complete learning content, remove placeholder wall panels, verify credits and recording/score permissions, and choose a code license with the owner.
3. Listen through all excerpts and check sustained dry/wet alignment, seek/reset/replay, keyboard/touch use, and Chrome/Safari/Firefox on actual devices.
4. Publish a new versioned candidate after those checks. Keep the existing snapshots and preserved root address available. Composer remains deferred.

## Publishing safeguards

- `archive/published-2025-12-23` identifies original commit `f4e7352db44d7d16d42339dc0199492fabca0cd7`.
- Development source is on `release/initial-publication`; only runtime files go into the preview directories.
- `tools/build-preview-payload.py PLAYBACK_REF ENGINEER_REF` creates the first two runtime tree descriptions. `tools/build-preview-payload.py --participation SOURCE_REF 06-volume-circles` packages Preview 06, mapping `participation.html` to its published `index.html`, and includes the comparison page. Git tree references reuse existing audio/image objects without modifying their contents.
- Create those trees, add their directory entries under a new `previews` tree, and add only that tree to the current `gh-pages` root. Verify all original root entries retain their modes, types, and hashes before advancing the branch with an expected-head check.
- Never overwrite an existing version path; add a new numbered preview when publishing subsequent changes. Updating the comparison page is allowed.
- Verify the GitHub Pages deployment succeeds and the published URLs load. Source commits alone do not prove deployment.
