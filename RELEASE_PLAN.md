# Initial release plan

Scope: develop **Listen → Explore → Mix**, beginning with one complete passage (Transition I–II), then expand to the four existing Boulez scenes. Spatial Atelier/composer (PR #25) is deferred.

Design priority: progressive participation. Listen requires only Play and makes the example mix and source roles legible. Explore adds listening positions and optional movement without changing playback. Mix gives the learner responsibility for spatialization, with equal access through a sound timeline or the full musical score. The owner approved this direction on 6 October 2026. This supersedes the earlier two-mode recommendation; the original and Previews 01/02 remain frozen. See [the Boulez context review](docs/BOULEZ_CONTEXT_REVIEW.md) for prior development context.

## Preserved online baseline

The original site at https://nyumusedlab.github.io/SpatialAudioNav/ preserves every root entry from `f4e7352db44d7d16d42339dc0199492fabca0cd7` (December 23, 2025). On 6 October 2026 the owner requested new GitHub Pages previews. Add versions only under `previews/` on `gh-pages`; do not replace the root app. Keep an additional archive branch at the original commit. Development continues on `release/initial-publication`. See [preview guide](docs/PREVIEW_GUIDE.md).

## 1. Audio correctness — in progress

- [x] Give Strophe V one automatic/manual resonance controller; keep the performer dry signal at full gain.
- [x] Remove the duplicate keyboard ramp that failed to update the manual setting.
- [x] Derive circular panning from playback time instead of screen refresh rate.
- [ ] Listen through all scenes and validate timing cues against the source material.
- [ ] Identify the recording and Roman/Arabic version, then document the cue-to-audio mapping for each excerpt.
- [x] Resolve Transition III–IV's automatic panner overriding manual engineer gains with explicit example/manual controls.
- [ ] Verify its final stationary-speaker passage against the recording and score.
- [ ] Verify Strophe V wet-file contents and the intended audible resonance location before changing its routing. Distinguish the hidden piano from the loudspeakers reproducing its sound.
- [ ] Verify speaker positions and labels across audio, 3D, and 2D views.

## 2. Playback lifecycle

- [x] Stop both Strophe V tracks when leaving the scene, on failure, and at playback completion.
- [x] Cancel stale asynchronous playback starts and reuse one audio context during scene switching.
- [x] Reset controls at track completion and reset ended tracks for replay.
- [ ] Complete listening checks for seek and reset across all scenes.
- [ ] Check dry/wet alignment through complete playback, buffering, seeking, reset, and replay; do not assume simultaneous play calls establish sustained synchronization.
- Ensure keyboard input does not interfere with focused controls; clear held keys on focus loss.

## 3. Layout and accessibility

- Make the title dismissible and remove dated draft labels.
- Make the information button open and close the same panel; fade the title while it is open, restore it on close, and respect reduced-motion preferences.
- Use separate Listen, Explore, and Mix presentations sharing one playback and cue state. Validate one passage before migrating other scenes.
- Keep free movement in Explore. Mix prioritizes a score or sound timeline and performance controls. The previous engineer 3D policy remains only in Preview 02.
- Label the red ring Performer and the white ring Audio Engineer; enlarge the performer ring for readability, with matching 2D/3D positions and no extra floating label panels.
- Arrange controls and scores for desktop and phone widths without overlap.
- Explain audience movement and engineer mixing controls in the interface.
- Clearly distinguish the demonstrated cue pattern from the learner's actual speaker gains. Each scene needs an understandable engineer task and an explicit way back to the reference behavior.
- Add accessible names, focus behavior, and appropriate dialog handling.

## 4. Educational content and publication assets

- Replace the five placeholder audience panels (issue #6).
- Fill the Composer, Piece, Technique, History, and scene information sections with sourced text.
- Add one short listen–try–compare activity per scene, led by the engineer's role. Explain the pre-rendered piano resonance and the limits of the listening model.
- Check historical quotations and references against their originals. Do not claim classroom trials, user testing, or measured learning outcomes that have not occurred.
- Preserve the project's collaborative development credits, subject to final owner review.
- Confirm recording and score-image permissions; record attribution and approved credits.
- Choose the code license with the project owner.

## 5. Release verification

- Remove or repair the obsolete AudioVisualizer module.
- Rewrite the README around the finished experience and live URL.
- Remove unused files from the published site and document dependencies.
- Verify all four scenes in audience and engineer modes, including Strophe V resonance and Transition 3–4 panning.
- Check current Chrome, Safari, Firefox, and touch devices for playback, rendering, controls, and layout.
- Confirm GitHub Pages deployment and complete a final check of the deployed site.

## Order after the context review

1. Make engineer control and cue feedback dependable, including the Transition III–IV conflict; validate the recording-specific musical behavior.
2. Deliver the small UI corrections: information toggle/title fade, role labels, mode styling, disabled 3D toggle, keyboard focus handling, and responsive layout.
3. Complete the learning activities, factual content, credits, and asset permissions.
4. Finish listening, accessibility, device, and browser checks before choosing a new deployment destination.

Real-time convolution remains a future requirement. Preserve a replaceable wet-source design, but defer an inactive convolver implementation, per-speaker convolution, VR, multi-user features, automatic score following, and general scene authoring until after the initial release.

## Verification so far

The existing live site loads and starts playback; mode and scene switching respond without immediate console errors. This is a smoke check, not musical or cross-browser approval. Focused audio regression tests run with `node --test tests/audio-effects.test.cjs`. Local preview also verified rapid scene changes, synchronized Strophe V playback, and pausing both tracks without console errors. Fourteen focused regression tests pass, including manual control, returning to the current example cue, and keyboard focus handling. Remaining release gates are deliberately unchecked.


## Preview 02 implementation status — 6 October 2026

Implemented explicit example/manual ownership for the engineer mix; clickable speaker switches; focus-loss key cleanup and focused-control guards; one responsive control column; a shared information toggle, close, and Escape action; title fade; visible disabled engineer 3D toggle; in-ring role labels; optional score panel; and short scene activities with stated model limitations. The obsolete AudioVisualizer script is no longer loaded. Scores still scroll approximately by elapsed duration. Phone controls use a scrollable panel.

Local checks covered desktop and 390 px layout, scene switching, playback controls, manual Transition III–IV control, Strophe V slider/reset, and information closure. This is a preview smoke check; full listening, cue accuracy, sustained track alignment, assistive-technology testing, and Safari/Firefox/device checks remain release gates. The five placeholder wall panels and final credits/permissions still need work.

## Preview 03 implementation status — 6 October 2026

A separate `participation.html` entry implements the accepted three-experience design for Transition I–II. It does not rewrite the earlier app. Listen defaults to the example, with a six-speaker map, actual signal-responsive lights, and a recorded-shadow label. Explore changes listener position or allows optional 3D movement. Mix starts from the surrounding background and provides held or latched keyboard/touch controls, a cue timeline, and the full score with manual zoom/scroll. All experiences use one media clock; view/position changes preserve playback time.

The cue guide remains provisional. The recording reports approximately 76 seconds; the inherited final distinct foreground change is at 56.151 seconds, held to the end. Verify whether this is intended, a different recording, or an incomplete cue map before changing it. The score is not claimed to be synchronized. Speaker light measures signal after the mix gain; rings show routing and remain visible when paused.

Next: review this passage by listening, verify its recording and cue/score correspondence, then apply the approved interaction pattern to the remaining excerpts. The strongest test is whether a newcomer can hear the gesture, locate it, compare positions, and deliberately perform the foreground changes without reading notation.

Automated checks cover cue boundaries, reference-data parity, manual ownership, independent simultaneous inputs, hold/latch behavior, focus-reset primitives, position bounds, and cancellation/replay. Desktop and 390 px browser checks cover layouts, playback continuity, score loading, keyboard/latch controls, and 3D. Physical multi-touch, auditory localization, musical accuracy, and other browsers remain unverified.

## Preview 04 correction — brief accents, 6 October 2026

The owner identified an audio/visual regression in Preview 03. Its model deduplicated repeated speaker rows, but the original `applyPattern()` uses the second row to release the gain back to 0.5. The earlier parity test checked raw rows rather than that behavior and therefore missed the regression. This also invalidates the Preview 03 interpretation above that the final accent is held until the end.

Preview 04 restores all twelve accent/release pairs, preserving the surrounding 0.5 bed. The first speaker-6 accent runs from 8.238 to 8.657 seconds; the final speaker-4 accent releases at 56.929 seconds. Automatic attack (0.1 s time constant) and release (0.3 s) envelopes are scheduled on the audio clock and reconstructed from media time when seeking. Manual takeover cancels future automatic events. Exact score correspondence still needs musical review.

The timeline now shows short accent bars with fading release tails. In Listen/Explore, amber pulses measure signal above the common surrounding bed instead of displaying persistent gold routing rings. Pausing extinguishes sound light. In Mix, a thin white selection outline and optional dashed example cue distinguish controls from audible excess. Physical devices and auditory localization remain unverified.

Regression checks now run the original stateful automation against every boundary, verify brief rise/decay and late background, check signal-relative light, and test scheduled releases and cancellation on manual takeover/pause. Preview 03 and all earlier snapshots remain unchanged; Preview 04 is the recommended version.

## Preview 05 — usable mobile room navigation, 6 October 2026

The prior renderer updated drawing-buffer dimensions with `setSize(..., false)` but left the canvas CSS size unset. A high-density buffer could therefore overflow the small frame; observed dimensions were 704×556 inside 354×280. Preview 05 explicitly fits the canvas to its container and updates pixel ratio/aspect on resize.

Opening 3D now dedicates the available screen to the room, with transport and Back retained. Whole room fits the speaker ring in portrait and landscape, shows the listener and heading, and supports tapping the floor to move. Dragging this overview rotates the camera without moving or turning the audio listener. Eye level follows the listener, with drag-to-turn and a wider portrait field of view. Hold buttons and keyboard movement remain available. Reset restores the audience position/whole-room view. Custom positions persist when returning to Explore and are not mislabeled as presets.

The musical and gain automation is unchanged from Preview 04. Focus/held-input cleanup, view switching during playback, viewport changes, tap bounds, and camera framing are checked. Physical-phone touch and Safari testing remain release verification work. All earlier numbered previews and the original are preserved.
