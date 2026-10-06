/** Concise preview guidance; musical cue validation is still in progress. */
const sourceLink = '<p><a href="https://brahms.ircam.fr/en/analysis/analyse-de-i-dialogue-de-l-ombre-double-i-%281985%29-de-pierre-boulez" target="_blank" rel="noopener">Read the IRCAM analysis by Andrew Gerzso</a></p>';
const previewNote = '<p><strong>About this preview:</strong> This is an exploratory listening model. Cue timing and the resonance setup are still being checked against the selected recording and score.</p>';
const sceneGuides = {
    default: { title: 'Sigle Initial', content: '<h3>From one speaker to many</h3><p>Listen to the programmed example, then try choosing how many speakers sound at once. How does the sense of space change?</p><p>In Audio Engineer, choose Mix yourself. Tap numbered speakers to switch them on, or hold keys 1–6. Moving bars indicate the example cues; speaker glow shows the audible levels.</p>' },
    'transition1-2': { title: 'Transition I–II', content: '<h3>Foreground and background</h3><p>Compare the distributed background with a louder foreground speaker. In Mix yourself, activate one speaker, then release it and listen to its return to the background.</p><p>Try making a musical gesture stand out, then choose Listen to example to compare.</p>' },
    'transition3-4': { title: 'Transition III–IV', content: '<h3>Movement and stillness</h3><p>Listen to the accelerating circular example. Switch to Mix yourself and make your own route by selecting speakers. Try pausing the movement on one speaker.</p><p>The example’s concluding stationary cue is still awaiting verification. This preview corrects who controls the mix, while preserving the existing automatic trajectory.</p>' },
    stropheV: { title: 'Strophe V', content: '<h3>Shape the resonance</h3><p>In Mix yourself, vary the piano resonance level with the slider or keys 0–9. Compare the clarity of the direct clarinet with the added resonance.</p><p>The direct clarinet stays audible. This preview mixes a pre-rendered resonance recording; it does not excite a live piano model. Listen to example restores the programmed level changes.</p>' }
};
const triviaContent = {
    composer: { title: 'Pierre Boulez', content: '<h3>Pierre Boulez</h3><p>Boulez’s Dialogue de l’ombre double invites attention to the relationship between the clarinet and its spatially distributed recorded counterpart.</p>' + sourceLink },
    piece: { title: 'About the experience', content: '<h3>Step into the engineer’s role</h3><p>Explore four excerpts through listening, movement, and choices about sound. Audience lets you change listening position, including the performer’s perspective. Audio Engineer lets you shape the mix and compare it with a programmed example.</p><p>Use headphones. The red ring marks the performer and the white ring marks the audio engineer.</p>' + previewNote },
    technique: { title: 'How to listen and mix', content: '<h3>Listen, try, compare</h3><p>Start with Listen to example in Audio Engineer. Choose Mix yourself to take control without restarting. In the first three scenes, tap speakers or hold keys 1–6. In Strophe V, adjust the resonance slider or use keys 0–9.</p><p>In Audience, move with W A S D and turn with J / L, drag, or the joystick. The location menu includes the performer’s viewpoint.</p>' + previewNote },
    history: { title: 'Spatial listening', content: '<h3>A live clarinet and its recorded shadow</h3><p>Dialogue de l’ombre double dates from 1985. Live strophes alternate with recorded sections. The spatial distribution helps articulate the musical material.</p>' + sourceLink + previewNote }
};
window.getTriviaContent = section => triviaContent[section] || triviaContent.piece;
window.getSceneTrivia = scene => {
    const guide = sceneGuides[scene] || sceneGuides.default;
    return { title: guide.title, content: guide.content + previewNote };
};
