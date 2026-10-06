const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/participation-core.js');

test('cue boundaries and seeking produce the same reference levels', () => {
    assert.deepEqual(C.referenceGains(0), [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    assert.equal(C.cueAt(8.237).current.speaker, null);
    assert.equal(C.cueAt(8.238).current.speaker, 6);
    assert.equal(C.cueAt(8.657).current.speaker, null);
    assert.deepEqual(C.referenceGains(9), Array(6).fill(0.5));
    assert.deepEqual(C.referenceGains(70), Array(6).fill(0.5));
    const expected = C.referenceGains(30);
    C.referenceGains(50); C.referenceGains(0);
    assert.deepEqual(C.referenceGains(30), expected);
    assert.equal(C.cueAt(80).next, null);
});

test('paired accent boundaries match the original stateful applyPattern behavior', () => {
    const fs = require('node:fs'), vm = require('node:vm');
    const source = fs.readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8');
    const start = source.indexOf('const timestampPatterns =');
    const end = source.indexOf('\n};', start) + 3;
    const data = vm.runInNewContext(source.slice(start, end) + '\ntimestampPatterns["transition1-2"]');
    const fn = source.slice(source.indexOf('function applyPattern(index)'), source.indexOf('    // Only apply pattern if NOT in engineer mode', source.indexOf('function applyPattern(index)'))) + '}';
    const targets = Array(6).fill(0.5);
    const ctx = { timestampPatterns: { 'transition1-2': data }, currentScene: 'transition1-2', isManualMix: () => false,
        t12SpeakerStates: Array.from({length:6}, () => ({state:'idle'})), audioCtx: {currentTime:0},
        gainNodes: targets.map((_, i) => ({gain:{cancelScheduledValues(){}, setTargetAtTime(value){targets[i]=value;}}})),
        updateVolumeDisplay(){}, window:{} };
    vm.createContext(ctx); vm.runInContext(fn, ctx);
    // Playback initializes the surrounding bed before the first timed event.
    for (let i = 1; i < data.timestamps.length; i++) {
        ctx.applyPattern(i);
        assert.deepEqual(C.referenceGains(data.timestamps[i]), targets, `event ${i}`);
    }
    assert.equal(C.accents.length, 12);
    assert.deepEqual(C.accents[0], {speaker:6,start:8.238,end:8.657,cueIndex:1});
});

test('accent envelope rises briefly, decays to the bed, and is stable across seeks', () => {
    assert.equal(C.referenceLevels(8.238)[5], 0.5);
    assert.ok(C.referenceLevels(8.6)[5] > 0.98);
    assert.ok(C.referenceLevels(8.9)[5] < 0.75);
    assert.ok(C.referenceLevels(10)[5] < 0.51);
    const expected = C.referenceLevels(8.9); C.referenceLevels(70);
    assert.deepEqual(C.referenceLevels(8.9), expected);
    C.referenceLevels(70).forEach(level => assert.ok(Math.abs(level - 0.5) < 1e-12));
});

test('accent light measures excess signal and vanishes in silence or at bed level', () => {
    assert.equal(C.accentStrength(0, 0), 0);
    assert.equal(C.accentStrength(0.04, 0.04), 0);
    assert.equal(C.accentStrength(0.02, 0.04), 0);
    assert.ok(C.accentStrength(0.08, 0.04) > C.accentStrength(0.05, 0.04));
});

test('manual gains survive seeking and reference cue changes', () => {
    const s = new C.Session(); s.setMode('mix'); s.press('key:2', 2); s.press('touch:8', 5);
    for (const time of [0, 12.84, 35, 2, 56]) assert.deepEqual(s.gains(time), [0.5, 1, 0.5, 0.5, 1, 0.5]);
    s.setMode('listen'); assert.deepEqual(s.gains(35), C.referenceGains(35));
    assert.equal(s.selected().size, 0);
});

test('multiple touches and keyboard sources release independently', () => {
    const s = new C.Session(); s.setMode('mix');
    s.press('pointer:1', 3); s.press('key:3', 3); s.press('pointer:2', 6);
    s.release('pointer:1'); assert.equal(s.gains(0)[2], 1);
    s.release('key:3'); assert.equal(s.gains(0)[2], 0.5); assert.equal(s.gains(0)[5], 1);
    s.clear(); assert.deepEqual(s.gains(0), Array(6).fill(0.5));
});

test('latch ignores repeat keydown, toggles on the next press, and clears on mode changes', () => {
    const s = new C.Session(); s.setMode('mix'); s.setInputStyle('latch');
    s.press('key:1', 1); s.press('key:1', 1); s.release('key:1');
    assert.equal(s.gains(0)[0], 1);
    s.press('key:1', 1); s.release('key:1'); assert.equal(s.gains(0)[0], 0.5);
    s.press('pointer:2', 5); s.setMode('explore'); s.setMode('mix'); assert.equal(s.selected().size, 0);
});

test('position changes keep automatic mixing; free movement stays within the room', () => {
    const s = new C.Session(); s.setMode('explore');
    for (const position of Object.keys(C.positions)) { s.setPosition(position); assert.deepEqual(s.gains(18), C.referenceGains(18)); }
    s.free = true; for (let i = 0; i < 100; i++) s.move(1, 1, 0.1, 0.05);
    assert.ok(Math.hypot(s.pose.x, s.pose.z) <= 5.500001);
    s.setMode('listen'); const pose = { ...s.pose }; s.move(1, 0, 1, 1); assert.deepEqual(s.pose, pose);
    assert.equal(C.positions.clarinetist.yaw, Math.PI);
    C.speakers.forEach(speaker => assert.ok(Math.abs(Math.hypot(speaker.x, speaker.z) - 7) < 1e-9));
});

function media() { return { paused: true, ended: false, currentTime: 0, play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; } }; }
test('cancelling during audio preparation prevents a late start', async () => {
    let ready; const m = media(); const p = new C.Playback(m, () => new Promise(resolve => { ready = resolve; }));
    const start = p.start(); p.stop(); ready(); await start;
    assert.equal(m.paused, true); assert.equal(p.pending, false); assert.equal(p.wanted, false);
});
test('a stale playback completion cannot revive cancelled audio', async () => {
    let finish; const m = media(); m.play = () => new Promise(resolve => { finish = () => { m.paused = false; resolve(); }; });
    const p = new C.Playback(m, async () => {}); const start = p.start(); await Promise.resolve();
    p.stop(); finish(); await start; assert.equal(m.paused, true);
});
test('rejected playback leaves retryable controls and ended replay starts at zero', async () => {
    const m = media(), p = new C.Playback(m, async () => {});
    m.play = async () => { throw Error('blocked'); };
    await assert.rejects(p.start()); assert.equal(p.wanted, false); assert.equal(p.pending, false);
    m.play = async () => { m.paused = false; }; m.ended = true; m.currentTime = 57;
    await p.start(); assert.equal(m.currentTime, 0); assert.equal(m.paused, false);
});


test('audio scheduling retains release events and cancels them on manual takeover or pause', () => {
    const fs = require('node:fs'), vm = require('node:vm');
    const source = fs.readFileSync(require('node:path').join(__dirname, '../js/participation.js'), 'utf8');
    const calls = Array.from({length:6}, () => []);
    const channels = calls.map(events => ({gain:{gain:{value:0.5,
        cancelScheduledValues(time){events.push(['cancel',time]);},
        setValueAtTime(value,time){events.push(['set',value,time]);},
        setTargetAtTime(value,time,tau){events.push(['target',value,time,tau]);}
    }}}));
    const session = new C.Session();
    const ctx = {C,session,channels,context:{currentTime:100},audio:{currentTime:8,playbackRate:1,paused:false,ended:false},
        document:{querySelectorAll:()=>[]},automationMode:'',plannedGains:[]};
    vm.createContext(ctx);
    vm.runInContext(source.slice(source.indexOf('    function scheduleExample()'),source.indexOf('    function updateListener')),ctx);
    ctx.applyMix(true);
    assert.ok(calls[5].some(c => c[0] === 'target' && c[1] === 1 && Math.abs(c[2]-100.238)<1e-9 && c[3] === 0.1));
    assert.ok(calls[5].some(c => c[0] === 'target' && c[1] === 0.5 && Math.abs(c[2]-100.657)<1e-9 && c[3] === 0.3));
    calls.forEach(events => events.length=0);
    session.setMode('mix');session.press('key:2',2);ctx.applyMix();
    calls.forEach(events => assert.deepEqual(events[0],['cancel',100]));
    assert.equal(calls[1].at(-1)[1],1);assert.equal(calls[5].at(-1)[1],0.5);
    calls.forEach(events => events.length=0);
    session.setMode('listen');ctx.audio.currentTime=8.9;ctx.audio.paused=true;ctx.applyMix(true);
    calls.forEach(events => assert.equal(events.filter(c=>c[0]==='target').length,0));
    assert.equal(calls[5][1][1],C.referenceLevels(8.9)[5]);
});
