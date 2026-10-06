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
