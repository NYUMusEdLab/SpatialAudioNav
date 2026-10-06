# Initial release plan

Scope: publish the four existing Boulez scenes with audience and audio engineer modes. Spatial Atelier/composer (PR #25) is deferred. Evaluate any useful layout changes separately rather than merging the whole PR.

## Preserved online baseline

The `gh-pages` branch is frozen at `f4e7352db44d7d16d42339dc0199492fabca0cd7` (December 23, 2025). GitHub Pages publishes its root directory at https://nyumusedlab.github.io/SpatialAudioNav/. Keep this branch unchanged; develop and review release work on `release/initial-publication`. Future deployment of the new version requires a separate explicit decision.

## 1. Audio correctness — in progress

- [x] Give Strophe V one automatic/manual resonance controller; keep the performer dry signal at full gain.
- [x] Remove the duplicate keyboard ramp that failed to update the manual setting.
- [x] Derive circular panning from playback time instead of screen refresh rate.
- [ ] Listen through all scenes and validate timing cues against the source material.
- [ ] Verify speaker positions and labels across audio, 3D, and 2D views.

## 2. Playback lifecycle

- Stop both Strophe V tracks when leaving the scene, on failure, and at playback completion.
- Make rapid scene switching safe; keep scene selection, audio graph, and playback controls consistent.
- Reset controls at track completion and verify replay, seek, pause, and reset.
- Ensure keyboard input does not interfere with focused controls; clear held keys on focus loss.

## 3. Layout and accessibility

- Make the title dismissible and remove dated draft labels.
- Arrange controls and scores for desktop and phone widths without overlap.
- Explain audience movement and engineer mixing controls in the interface.
- Add accessible names, focus behavior, and appropriate dialog handling.

## 4. Educational content and publication assets

- Replace the five placeholder audience panels (issue #6).
- Fill the Composer, Piece, Technique, History, and scene information sections with sourced text.
- Confirm recording and score-image permissions; record attribution and approved credits.
- Choose the code license with the project owner.

## 5. Release verification

- Remove or repair the obsolete AudioVisualizer module.
- Rewrite the README around the finished experience and live URL.
- Remove unused files from the published site and document dependencies.
- Verify all four scenes in audience and engineer modes, including Strophe V resonance and Transition 3–4 panning.
- Check current Chrome, Safari, Firefox, and touch devices for playback, rendering, controls, and layout.
- Confirm GitHub Pages deployment and complete a final check of the deployed site.

## Verification so far

The existing live site loads and starts playback; mode and scene switching respond without immediate console errors. This is a smoke check, not musical or cross-browser approval. Focused audio regression tests run with `node --test tests/audio-effects.test.cjs`. Remaining release gates are deliberately unchecked.
