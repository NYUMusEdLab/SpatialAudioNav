# Versioned previews

The original site remains at <https://nyumusedlab.github.io/SpatialAudioNav/>. New previews live under <https://nyumusedlab.github.io/SpatialAudioNav/previews/>. These are development snapshots, not the final public release.

## Compare in this order

1. **01 — Playback fixes:** the earlier interface with corrected resonance control, playback cancellation, scene cleanup, and playback-time circular panning. Use this to isolate the audio changes from the new interface.
2. **02 — Engineer controls:** the same audio foundation plus explicit “Listen to example” and “Mix yourself” choices, speaker switches, focus handling, role labels, responsive controls, and short listening activities.
3. In Preview 02 choose Audio Engineer, then Transition 3–4. Start the example, switch to Mix yourself, and tap a speaker. Your choice should persist. Return to Listen to example without restarting.
4. Try Strophe V. In Mix yourself, vary the resonance slider; the direct clarinet remains. Compare with the example. Pause, reset, seek using Audio Visualization, and change scenes.
5. Open the information guide, close it with the same button or Escape, and compare Audience and Performer Perspective. On a phone, scroll the controls panel to reach additional controls.

## Next release steps

1. Identify the recording/version and confirm the cue map, especially the final stationary passage in Transition III–IV. Establish the wet recording's contents and intended audible resonance location.
2. Complete learning content, remove placeholder wall panels, verify credits and recording/score permissions, and choose a code license with the owner.
3. Listen through all excerpts and check sustained dry/wet alignment, seek/reset/replay, keyboard/touch use, and Chrome/Safari/Firefox on actual devices.
4. Publish a new versioned candidate after those checks. Keep the existing snapshots and preserved root address available. Composer remains deferred.

## Publishing safeguards

- `archive/published-2025-12-23` identifies original commit `f4e7352db44d7d16d42339dc0199492fabca0cd7`.
- Development source is on `release/initial-publication`; only runtime files go into the preview directories.
- `tools/build-preview-payload.py PLAYBACK_REF ENGINEER_REF` creates the two runtime tree descriptions and landing-page content. Git tree references reuse existing audio/image objects without modifying their contents.
- Create those trees, add their directory entries under a new `previews` tree, and add only that tree to the current `gh-pages` root. Verify all original root entries retain their modes, types, and hashes before advancing the branch with an expected-head check.
- Never overwrite an existing version path; add a new numbered preview when publishing subsequent changes. Updating the comparison page is allowed.
- Verify the GitHub Pages deployment succeeds and the published URLs load. Source commits alone do not prove deployment.
