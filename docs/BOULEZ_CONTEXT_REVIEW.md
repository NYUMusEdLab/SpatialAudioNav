# Boulez project context and release decisions

Reviewed 6 October 2026 against the current `release/initial-publication` code. This records development recommendations, not completed features or permission to replace the frozen GitHub Pages site.

## Purpose recovered from the development discussions

The central learning experience is to make musical decisions as an audio engineer: anticipate a cue, choose a speaker or spatial gesture, shape a level, listen, and compare. Audience navigation and the clarinetist's listening position provide complementary perspectives. The project makes selected aspects of an archival spatial work accessible on everyday devices.

The earlier research discussion describes a progression from conceptual prototypes to a Web Audio tool and an immersive interface. It also explicitly withdraws claims that user testing had taken place. Product copy must describe educational aims and observable features, without presenting proposed evaluations or earlier assistant-generated claims as results.

The current README records the later combination of Audience and Performer into one interface. Preserve that design evolution; three learning perspectives do not require three mode buttons. Composer/Spatial Atelier remains deferred.

## Decisions by discussion

| Discussion | Decision for the initial release | Reason and implementation boundary |
| --- | --- | --- |
| Boulez Dialogue Shadow | Adopt the engineer-led learning purpose and brief scene-specific listening activities. | Use the historical discussion as design context. Verify factual claims and quotations in original sources; do not import the manuscript wholesale or claim unperformed user studies. |
| Disable 3D Button Engineer Mode | Adopt the requested visible, disabled 3D toggle. | Keep the engineer's present 2D-first layout. The latest assistant replacement also forces the 3D inset visible, which is an extra change and conflicts with the earlier request to disable the display. Default to keeping that inset hidden. Leave the separate audio-visualization toggle available. |
| Clean UI and Text Removal | Adapt the mode-class approach to the two existing modes. | Centralize visibility rules and remove conflicting inline styles. Preserve the performer viewpoint inside Audience. The existing shared position/orientation update already serves the camera, map arrow, and audio listener. |
| Move Toggle Button | Adopt the information-button toggle and title fade. | Opening, closing with the same button, closing with X, and Escape should share one state. Restore focus, provide accessible names/state, and respect reduced motion. Populate the panel so it has useful content when opened. |
| Add labels to circles | Adopt compact labels inside the rings and a more readable performer ring. | Red means Performer; white means Audio Engineer. Match labels and ring size in 2D and 3D. Keep the current performer coordinate, shared with the listening preset and dry source, until the overall geometry is checked. |
| 3D Audio Visualizer Dev | Adopt synchronization, one mix controller, smooth level changes, and future replaceability of the wet source. Reject the proposed wholesale audio replacement. | The supplied replacement changes routing and musical behavior. Parts of the cleanup are already implemented; see below. Real-time convolution remains future work requiring an identified impulse response, level/tail checks, spatial routing, and device validation. |
| Sonic Visualizer Audio Visualization | Use as guidance for preparing accurate educational assets. | Label concert versus written pitch and frequency units; the later response corrects an earlier octave error. Keep the release focused on useful contour/cue displays, not a new spectral-analysis workstation. |

## Changes already present; avoid regressions

- Strophe V has one automatic/manual resonance controller; the duplicate keyboard ramp has been removed. The development branch keeps the dry performer audible while varying the resonance contribution.
- Playback cancellation, stopping both Strophe V tracks, scene cleanup, and replay handling have been improved and have focused regression coverage. Sustained dry/wet alignment under buffering and seeking remains unverified.
- `moveToPerformerPerspective()` uses the current performer location (`z = -4.111`) and `rotationAngle = Math.PI`, then updates the shared listener state. With this code's forward vector `(-sin(angle), 0, -cos(angle))`, that faces positive Z. The older suggestion to set the angle to zero would reverse the intended direction.
- Circular panning now derives its angle from playback time. That fixes display-refresh dependence; it does not validate the musical cue schedule.

## Audio proposals that should not be copied

1. **Equal-power dry/wet replacement.** At maximum wet, the proposed function silences the direct clarinet. That changes the present additive resonance model. First establish whether the wet asset contains only the effect or also some direct signal, then choose and document the intended gain law and headroom.
2. **Six-speaker Strophe V routing.** The replacement discards the current localized performer/resonance paths, removes initialization of the hidden-source position, and routes the future convolver directly to the output without spatial positioning. The claim that this leaves the sound unchanged is incorrect. Different performance realizations must be evaluated explicitly.
3. **Generic percentage-of-duration envelope.** The proposed 20/70/90-percent schedule replaces the current excerpt-specific cue times. It is not a verified score map. Do not add another animation loop to control the same gains.
4. **Untested periodic hard seeks.** Adopt alignment as a requirement, not an arbitrary 35 ms correction threshold as a proven solution. Measure full-track behavior and buffering first; assess audible correction artifacts and a shared-clock playback design if needed.
5. **Old coordinate edits.** The suggestion to move the performer from `z = -2` to `-1.2` did not implement the stated move toward the front speakers, and predates the present shared position. Labeling should not independently move the acoustic source or viewpoint.

## Release issues sharpened by the context review

### Engineer control and meaningful feedback

At the time of review, `animateCircularPanning()` wrote all six gains every frame without checking the mode. Preview 02 resolves that conflict with explicit example/manual ownership. Engineer key presses also write those gains. In that reviewed version of Transition III–IV, automatic motion therefore took control back from a learner's manual input. This conflicts with the project's main educational purpose. Define a clear reference-listening versus manual-performance behavior for that scene; do not let competing writers silently decide it.

Cue anticipation should show the intended reference gesture while speaker activity shows the learner's actual output. Explain their different meanings. The Strophe V 0–9-second patterns are explicitly decorative in the code; they must not be presented as verified spatial cues. The score display also scrolls by elapsed percentage, not by an established note-to-time map.

### Recording-specific musical behavior

The primary IRCAM analysis describes Transition III–IV accelerating and then becoming stationary on one speaker during the concluding repeated notes. The current panner rotates until playback ends and bypasses the stored transition timestamps. Identify the actual final cue time and speaker from the selected recording/score before implementing the stop; the existing development markers are not sufficient evidence. [Gerzso, IRCAM analysis](https://brahms.ircam.fr/en/analysis/analyse-de-i-dialogue-de-l-ombre-double-i-%281985%29-de-pierre-boulez)

For resonance, distinguish the physical piano's location from the audible amplification output. IRCAM's analysis describes a hidden piano whose captured resonance is reproduced near the performer. The app currently locates its wet source behind the front speakers. Treat that as a model needing an explicit rationale, not as a verified reproduction of every realization. [Gerzso, setup discussion](https://brahms.ircam.fr/en/analysis/analyse-de-i-dialogue-de-l-ombre-double-i-%281985%29-de-pierre-boulez)

Later realizations differ: the 2025 Comte documentation describes direct resonance on front speakers with surround reverberation and clarifies that the score fader controls the resonator input, with output control also available to shorten the tail. Scaling a pre-rendered wet recording cannot reproduce changing the resonator's excitation. Explain that release limitation and carry input-versus-output control into the future convolution design. Record the Roman/Arabic version and asset provenance before revising routing. [IRCAM, Comte 2025 implementation](https://brahms.ircam.fr/fr/sidney/dialogue-de-l%27ombre-double-comte-2025-milan)

### Learning content and claims

Prepare one short activity per excerpt: notice changing spatial density in Sigle Initial; compare foreground and background in Transition I–II; follow acceleration and its final stop in Transition III–IV; vary and compare the resonance contribution in Strophe V. Each needs a listening prompt, an action, and a comparison with the reference. The first three topics follow the IRCAM analysis; Strophe V's activity must also match the chosen assets and version. [Gerzso, musical role of spatialisation](https://brahms.ircam.fr/en/analysis/analyse-de-i-dialogue-de-l-ombre-double-i-%281985%29-de-pierre-boulez)

Replace empty information sections and placeholder wall panels with concise, sourced content. Verify claims about priority, links to other Boulez works, quotations, and publication details before use. Private correspondence supplies design context but should not be copied into public app text by default. Confirm development credits across the project's contributors alongside recording and score credits.

## Implementation sequence and acceptance

1. Resolve competing engineer/automatic controls; map the selected recordings and musical cues. Verify repeat, seek, scene switch, and dry/wet alignment by listening as well as state checks.
2. Implement the agreed UI refinements as a small, separately reviewable change. Check keyboard/touch use, both modes, all four scenes, panel closure, reduced motion, and label alignment.
3. Add the learning prompts, reliable source notes, credits, and honest descriptions of approximations. Check content against the actual release build.
4. Complete cross-browser/device checks and asset permissions. Preserve the original site at the root of `gh-pages`; the owner subsequently authorized separate versioned previews under `previews/`.

Defer composer/authoring, WebXR, multi-user avatars, arbitrary speaker layouts, AI cue following, and live convolution. Revisit them only after the four-scene learning experience is coherent and reliable.

## Review limits

This review compares seven project discussions, including earlier research rationale and explicit user corrections, with current source code and primary IRCAM documentation. Historical pasted code and assistant proposals are not proof of deployed behavior. Referenced scholarly PDFs, private correspondence, and recording rights have not received a complete source/permissions audit here. No runtime audio or interface change is made by this review document.

## Subsequent owner direction — 6 October 2026

The owner clarified progressive participation: passive observation/listening, changing listening perspective, and performing the engineer’s mix. The accepted Preview 03 implements Listen / Explore / Mix for Transition I–II, with notation optional through equal score and sound-timeline views. This supersedes the earlier recommendation to retain only the two existing modes for future development. The original and Previews 01/02 preserve that earlier interface. Composer remains deferred. The historical/contextual findings above continue to inform the content and musical verification work.
