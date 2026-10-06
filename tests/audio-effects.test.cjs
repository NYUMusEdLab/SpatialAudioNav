const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8');
function functionSource(name) {
    const start = source.indexOf(`function ${name}(`);
    assert.notEqual(start, -1);
    const end = source.indexOf('\n}', start);
    return source.slice(start, end + 2);
}
function gain() {
    return { gain: { value: 0, setTargetAtTime(value) { this.value = value; } } };
}
function context() {
    const ctx = {
        currentScene: 'stropheV', currentMode: 'audience', manualWetAmount: 0,
        currentAudioElement: { currentTime: 0, duration: 80 },
        dryGain: gain(), wetGain: gain(), audioCtx: { currentTime: 0 },
        window: {}, document: { getElementById: () => null },
        circularPanner: { active: true, speed: 0.5, angle: 0 },
        accelerationFactor: 1, gainNodes: Array.from({ length: 6 }, gain),
        requestAnimationFrame: () => 1, animationFrameId: null,
    };
    vm.createContext(ctx);
    for (const name of ['updateStropheVCrossfade', 'setDryWetAmount', 'animateCircularPanning']) {
        vm.runInContext(functionSource(name), ctx);
    }
    return ctx;
}

test('audience resonance follows musical cues while the dry performer stays audible', () => {
    const ctx = context();
    for (const [time, expected] of [[0, 0.5], [4, 0], [33.483, 0], [43.6, 1], [69.5, 0], [80, 0]]) {
        ctx.currentAudioElement.currentTime = time;
        ctx.updateStropheVCrossfade();
        assert.ok(Math.abs(ctx.wetGain.gain.value - expected) < 1e-9);
        assert.equal(ctx.dryGain.gain.value, 1);
    }
});

test('engineer input overrides automation and updates the slider and percentage', () => {
    const ctx = context();
    const slider = {}, percentage = {};
    ctx.document.getElementById = id => id === 'dryWetSlider' ? slider : percentage;
    ctx.currentMode = 'engineer';
    ctx.currentAudioElement.currentTime = 43.6;
    ctx.setDryWetAmount(0.25);
    assert.equal(ctx.wetGain.gain.value, 0.25);
    assert.equal(ctx.dryGain.gain.value, 1);
    assert.equal(slider.value, 25);
    assert.equal(percentage.textContent, '25%');
    ctx.setDryWetAmount(2);
    assert.equal(ctx.manualWetAmount, 1);
});

test('panning is identical at the same playback time regardless of frame count or seeking', () => {
    const ctx = context();
    ctx.currentAudioElement.currentTime = 20;
    ctx.animateCircularPanning();
    const angle = ctx.circularPanner.angle;
    const gains = ctx.gainNodes.map(node => node.gain.value);
    for (let frame = 0; frame < 144; frame++) ctx.animateCircularPanning();
    assert.equal(ctx.circularPanner.angle, angle);
    assert.deepEqual(ctx.gainNodes.map(node => node.gain.value), gains);
    ctx.currentAudioElement.currentTime = 50;
    ctx.animateCircularPanning();
    ctx.currentAudioElement.currentTime = 20;
    ctx.animateCircularPanning();
    assert.equal(ctx.circularPanner.angle, angle);
    ctx.currentAudioElement.currentTime = 0;
    ctx.animateCircularPanning();
    assert.equal(ctx.circularPanner.angle, 0);
});

test('only one manual ramp and resonance controller remain', () => {
    assert.equal((source.match(/function rampDryWetAmount\(/g) || []).length, 1);
    assert.equal(source.includes('updateDryWetBalance('), false);
    assert.equal(source.includes('requestAnimationFrame(updateStropheVCrossfade)'), false);
});

function media() {
    return {
        currentTime: 0, ended: false, paused: true, listeners: {},
        pause() { this.paused = true; },
        play() { this.paused = false; return Promise.resolve(); },
        addEventListener(name, callback) { this.listeners[name] = callback; },
    };
}
function playbackContext() {
    const ctx = context();
    Object.assign(ctx, {
        playbackGeneration: 0, playbackPending: false, isStropheVPlaying: false,
        currentAudioElement: media(), stropheWetAudioElement: media(),
        playPauseButton: { dataset: { playing: 'false' }, style: { setProperty() {} } },
        initAudioContext: () => Promise.resolve(),
        stopPatternSwitching() {}, stopSpecialEffects() {},
        startPatternSwitching() {}, startSpecialEffects() {},
        updateArabicPlayhead() {}, console: { error() {} },
    });
    for (const name of ['setPlaybackState', 'stopPlayback', 'bindPlaybackEvents']) {
        vm.runInContext(functionSource(name), ctx);
    }
    vm.runInContext('async ' + functionSource('togglePlayback'), ctx);
    return ctx;
}

test('Strophe V starts together and pauses both tracks', async () => {
    const ctx = playbackContext();
    ctx.currentAudioElement.currentTime = 12;
    await ctx.togglePlayback();
    assert.equal(ctx.stropheWetAudioElement.currentTime, 12);
    assert.equal(ctx.playPauseButton.dataset.playing, 'true');
    await ctx.togglePlayback();
    assert.equal(ctx.currentAudioElement.paused, true);
    assert.equal(ctx.stropheWetAudioElement.paused, true);
    assert.equal(ctx.isStropheVPlaying, false);
});

test('partial Strophe V playback failure stops both tracks', async () => {
    const ctx = playbackContext();
    ctx.stropheWetAudioElement.play = () => Promise.reject(new Error('wet failed'));
    await ctx.togglePlayback();
    assert.equal(ctx.currentAudioElement.paused, true);
    assert.equal(ctx.stropheWetAudioElement.paused, true);
    assert.equal(ctx.playPauseButton.dataset.playing, 'false');
});

test('cancelling a pending start prevents stale completion from restarting controls', async () => {
    const ctx = playbackContext();
    let resolve, started;
    const ready = new Promise(done => { started = done; });
    ctx.currentAudioElement.play = () => new Promise(done => { resolve = done; started(); });
    const playing = ctx.togglePlayback();
    await ready;
    ctx.stopPlayback();
    resolve();
    await playing;
    assert.equal(ctx.playPauseButton.dataset.playing, 'false');
    assert.equal(ctx.isStropheVPlaying, false);
});

test('track completion stops wet playback and replay resets both positions', async () => {
    const ctx = playbackContext();
    const dry = ctx.currentAudioElement;
    ctx.bindPlaybackEvents(dry);
    await ctx.togglePlayback();
    dry.currentTime = 80;
    dry.ended = true;
    dry.listeners.ended();
    assert.equal(ctx.playPauseButton.dataset.playing, 'false');
    assert.equal(ctx.stropheWetAudioElement.paused, true);
    await ctx.togglePlayback();
    assert.equal(dry.currentTime, 0);
    assert.equal(ctx.stropheWetAudioElement.currentTime, 0);
});

test('events from a replaced dry track do not stop the new scene', async () => {
    const ctx = playbackContext();
    const old = media();
    ctx.bindPlaybackEvents(old);
    await ctx.togglePlayback();
    old.listeners.ended();
    old.listeners.error();
    assert.equal(ctx.playPauseButton.dataset.playing, 'true');
});

test('rapid scene switches stop the wet track and only restart the latest scene', async () => {
    const ctx = playbackContext();
    const completions = [];
    const buttons = [];
    Object.assign(ctx, {
        audioSource: null, stropheWetAudioSource: null, masterGain: null,
        performerDryPanner: null, hiddenWetPanner: null, panners: [],
        wetPanners: [], wetGainNodes: [], currentMode: 'audience',
        audioElements: { default: media(), 'transition1-2': media(), 'transition3-4': media(), stropheV: media() },
        timestampPatterns: Object.fromEntries(['default', 'transition1-2', 'transition3-4', 'stropheV'].map(name => [name, {timestamps: [0], patterns: [[1,0,0,0,0,0]]}])),
        hiddenSpeakerPosition: null,
        updateScoreForCurrentScene() {}, resetT12SpeakerStates() {},
        toggleVolumeDisplayVisibility() {}, toggleDryWetControlVisibility() {},
        updateArabicVisualizationImage() {},
        setupWebAudio: () => new Promise(done => completions.push(done)),
    });
    ctx.document.querySelectorAll = () => buttons;
    vm.runInContext(functionSource('setScene'), ctx);
    await ctx.togglePlayback();
    ctx.setScene('transition1-2');
    assert.equal(ctx.stropheWetAudioElement.paused, true);
    ctx.setScene('transition3-4');
    completions[0]();
    completions[1]();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(ctx.currentScene, 'transition3-4');
    assert.equal(ctx.audioElements['transition1-2'].paused, true);
    assert.equal(ctx.playPauseButton.dataset.playing, 'false');
});
