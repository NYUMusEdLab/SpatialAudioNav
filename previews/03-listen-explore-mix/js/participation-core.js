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
    // Repeated entries have identical output; show only actual changes in the guide.
    const cues = times.map((time, i) => ({ time, speaker: foreground[i] }))
        .filter((cue, i, all) => i === 0 || cue.speaker !== all[i - 1].speaker);
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
    class Session {
        constructor() {
            this.mode = 'listen'; this.position = 'audience'; this.free = false;
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
            this.position = position; this.pose = { ...positions[position] };
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
        move(forward, sideways, turn, dt) {
            if (this.mode !== 'explore' || !this.free) return;
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
    return { cues, speakers, positions, cueAt, referenceGains, Session, Playback };
});
