const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/participation-core.js');

test('cue boundaries and seeking produce the same reference levels', () => {
    assert.deepEqual(C.referenceGains(0), [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    assert.equal(C.cueAt(8.237).current.speaker, null);
    assert.equal(C.cueAt(8.238).current.speaker, 6);
    assert.equal(C.cueAt(8.657).current.speaker, 6);
    const expected = C.referenceGains(30);
    C.referenceGains(50); C.referenceGains(0);
    assert.deepEqual(C.referenceGains(30), expected);
    assert.equal(C.cueAt(80).next, null);
});

test('guide retains the legacy speaker changes without inventing score alignment', () => {
    const fs = require('node:fs'), vm = require('node:vm');
    const source = fs.readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8');
    const start = source.indexOf('const timestampPatterns =');
    const end = source.indexOf('\n};', start) + 3;
    const data = vm.runInNewContext(source.slice(start, end) + '\ntimestampPatterns["transition1-2"]');
    data.timestamps.forEach((time, i) => {
        const expected = data.patterns[i].map(n => n ? 1 : 0.5);
        // Legacy initialization starts the all-speaker background at half level.
        if (i === 0) expected.fill(0.5);
        assert.deepEqual(C.referenceGains(time), Array.from(expected));
    });
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
