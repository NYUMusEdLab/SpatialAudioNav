/* Shared timing and input model for the Transition I–II participation study.
 * Cue data is inherited from script.js, not a verified score-to-recording map.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.ParticipationCore = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
    const times = [0, 8.238, 8.657, 10.897, 11.442, 12.834, 13.283, 16.761, 17.966, 18.536, 19.240, 21.339, 22.231, 26.715, 27.833, 29.779, 30.296, 38.051, 38.437, 40.586, 41.628, 47.053, 47.710, 56.151, 56.929];
    const foreground = [null, 6, 6, 5, 5, 2, 2, 3, 3, 4, 4, 1, 1, 2, 2, 1, 1, 3, 3, 5, 5, 6, 6, 4, 4];
    // In the original applyPattern(), the second entry for a speaker releases it.
    // Preserve every boundary: these pairs describe brief accents, not held routes.
    const cues = times.map((time, i) => ({
        time, speaker: i % 2 ? foreground[i] : null,
        releasedSpeaker: i > 0 && i % 2 === 0 ? foreground[i] : null
    }));
    const accents = cues.flatMap((cue, i) => cue.speaker ? [{
        speaker: cue.speaker, start: cue.time, end: cues[i + 1].time, cueIndex: i
    }] : []);
    const attack = 0.1, release = 0.3;
    const speakers = [210, 150, 90, 30, 330, 270].map((degrees, i) => ({
        id: i + 1, x: 7 * Math.sin(degrees * Math.PI / 180), y: 1.7,
        z: 7 * Math.cos(degrees * Math.PI / 180)
    }));
    const positions = {
        audience: { x: 0, y: 1.7, z: 2, yaw: 0, label: 'Audience' },
        clarinetist: { x: 0, y: 1.7, z: -4.111, yaw: Math.PI, label: 'Clarinetist' },
        engineer: { x: 0, y: 1.7, z: 0, yaw: 0, label: 'Audio engineer' }
    };
    function cueAt(time) {
        let index = 0;
        for (let i = 1; i < cues.length; i++) if (cues[i].time <= time) index = i;
        return { current: cues[index], next: cues[index + 1] || null, index };
    }
    function referenceGains(time) {
        const selected = cueAt(time).current.speaker;
        return speakers.map(s => s.id === selected ? 1 : 0.5);
    }
    // Evaluate the same exponential envelopes at any media time, including seeks.
    function referenceLevels(time) {
        return speakers.map(s => {
            let level = 0.5, target = 0.5, previous = 0, tau = release;
            for (const cue of cues) {
                if (cue.time > time) break;
                level = target + (level - target) * Math.exp(-(cue.time - previous) / tau);
                target = cue.speaker === s.id ? 1 : 0.5;
                tau = target > 0.5 ? attack : release;
                previous = cue.time;
            }
            return target + (level - target) * Math.exp(-(Math.max(0, time) - previous) / tau);
        });
    }
    // Signal above the 50% surrounding bed. Metering is before positional panning.
    function accentStrength(signal, background) {
        return Math.min(1, Math.sqrt(Math.max(0, signal - background - 0.0005) * 12));
    }
    // Shared visual meter for the map and both room cameras. This is measured
    // output at the speaker, not a held selection or the listener's distance.
    function speakerFeedback(signal, background, playing) {
        const level = playing ? Math.min(1, Math.sqrt(Math.max(0, signal) * 12)) : 0;
        const accent = playing ? accentStrength(signal, background) : 0;
        const radius = 17 + level * 22;
        return { level, radius, opacity: Math.min(1, level * 1.8), accent,
            accentRadius: radius + 3 + accent * 10 };
    }
    // Keep the entire speaker ring and its labels inside either screen orientation.
    function overviewBounds(aspect) {
        const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
        return { halfWidth: 9.5 * Math.max(1, ratio), halfHeight: 9.5 * Math.max(1, 1 / ratio) };
    }
    function eyeFov(aspect) {
        return Math.max(75, Math.min(110, 2 * Math.atan(1 / Math.max(0.1, aspect)) * 180 / Math.PI));
    }
    class Session {
        constructor() {
            this.mode = 'listen'; this.position = 'audience'; this.free = false; this.customPosition = false;
            this.holds = new Map(); this.latched = new Set(); this.inputStyle = 'hold';
            this.pose = { ...positions.audience };
        }
        clear() { this.holds.clear(); this.latched.clear(); }
        setMode(mode) {
            if (!['listen', 'explore', 'mix'].includes(mode)) return;
            this.clear(); this.mode = mode; this.free = false;
            this.setPosition(mode === 'mix' ? 'engineer' : mode === 'listen' ? 'audience' : this.position);
        }
        setPosition(position) {
            if (!positions[position]) return;
            this.position = position; this.pose = { ...positions[position] }; this.customPosition = false;
        }
        setInputStyle(style) {
            if (!['hold', 'latch'].includes(style)) return;
            this.clear(); this.inputStyle = style;
        }
        press(source, speaker) {
            if (this.mode !== 'mix' || speaker < 1 || speaker > 6 || this.holds.has(source)) return;
            this.holds.set(source, speaker);
            if (this.inputStyle === 'latch') {
                if (this.latched.has(speaker)) this.latched.delete(speaker);
                else this.latched.add(speaker);
            }
        }
        release(source) { this.holds.delete(source); }
        selected() { return this.inputStyle === 'latch' ? this.latched : new Set(this.holds.values()); }
        gains(time) {
            return this.mode === 'mix' ? speakers.map(s => this.selected().has(s.id) ? 1 : 0.5) : referenceGains(time);
        }
        moveTo(x, z) {
            if (this.mode !== 'explore' || !this.free || !Number.isFinite(x) || !Number.isFinite(z)) return;
            const scale = Math.min(1, 5.5 / (Math.hypot(x, z) || 1));
            this.pose.x = x * scale; this.pose.z = z * scale; this.customPosition = true;
        }
        move(forward, sideways, turn, dt) {
            if (this.mode !== 'explore' || !this.free) return;
            if (forward || sideways || turn) this.customPosition = true;
            this.pose.yaw += turn * dt * 1.4;
            const angle = this.pose.yaw;
            this.pose.x += (-Math.sin(angle) * forward + Math.cos(angle) * sideways) * dt * 2;
            this.pose.z += (-Math.cos(angle) * forward - Math.sin(angle) * sideways) * dt * 2;
            const radius = Math.hypot(this.pose.x, this.pose.z);
            if (radius > 5.5) { this.pose.x *= 5.5 / radius; this.pose.z *= 5.5 / radius; }
        }
    }
    class Playback {
        constructor(media, prepare) { this.media = media; this.prepare = prepare; this.generation = 0; this.wanted = false; this.pending = false; }
        stop() { this.generation++; this.wanted = false; this.pending = false; this.media.pause(); }
        async start() {
            const generation = ++this.generation;
            this.wanted = true; this.pending = true;
            try {
                await this.prepare();
                if (generation !== this.generation) return;
                if (this.media.ended) this.media.currentTime = 0;
                await this.media.play();
                if (generation !== this.generation) { if (!this.wanted) this.media.pause(); return; }
                this.pending = false;
            } catch (error) {
                if (generation !== this.generation) return;
                this.stop(); throw error;
            }
        }
    }
    return { cues, accents, attack, release, speakers, positions, cueAt, referenceGains, referenceLevels, accentStrength, speakerFeedback, overviewBounds, eyeFov, Session, Playback };
});
