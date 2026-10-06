/* Preview 03: a single-excerpt study with one shared media clock. */
(() => {
    'use strict';
    const C = window.ParticipationCore;
    const session = new C.Session();
    const $ = id => document.getElementById(id);
    const audio = $('excerpt');
    const canvas = $('room-map');
    const draw = canvas.getContext('2d');
    const keys = new Set(), walkPointers = new Map();
    const speakerKeys = { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, u: 1, i: 2, k: 3, m: 4, n: 5, h: 6 };
    let context, master, channels = [], setupPromise, raf = 0, lastFrame = 0;
    let view = 'timeline', guide = true, room, drag = null, lastCue = -1;
    let plannedGains = [], listeningPose = '';
    const rms = Array(6).fill(0);
    const formatTime = value => Number.isFinite(value) ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}` : '—';
    const cueName = cue => cue?.speaker ? `Speaker ${cue.speaker} forward` : 'Surrounding background';

    async function prepareAudio() {
        if (!setupPromise) setupPromise = (async () => {
            context = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
            const source = context.createMediaElementSource(audio);
            master = context.createGain(); master.gain.value = Number($('volume').value) / 300;
            master.connect(context.destination);
            channels = C.speakers.map(s => {
                const gain = context.createGain();
                const meter = context.createAnalyser(); meter.fftSize = 256;
                const panner = context.createPanner();
                panner.panningModel = 'HRTF'; panner.distanceModel = 'inverse';
                panner.refDistance = 2; panner.maxDistance = 100;
                panner.positionX.value = s.x; panner.positionY.value = s.y; panner.positionZ.value = s.z;
                gain.gain.value = session.gains(audio.currentTime)[s.id - 1];
                source.connect(gain); gain.connect(meter); meter.connect(panner); panner.connect(master);
                return { gain, meter, samples: new Float32Array(meter.fftSize) };
            });
            plannedGains = []; applyMix(); updateListener(true);
        })();
        await setupPromise;
        if (context.state === 'suspended') await context.resume();
    }
    const playback = new C.Playback(audio, prepareAudio);
    function applyMix() {
        const values = session.gains(audio.currentTime);
        channels.forEach((channel, i) => {
            if (plannedGains[i] === values[i]) return;
            channel.gain.gain.setTargetAtTime(values[i], context.currentTime, values[i] > (plannedGains[i] || 0) ? 0.04 : 0.15);
        });
        plannedGains = values;
        document.querySelectorAll('.speaker-pad').forEach((pad, i) => {
            pad.setAttribute('aria-pressed', String(session.selected().has(i + 1)));
            pad.querySelector('output').textContent = `${Math.round(values[i] * 100)}%`;
        });
    }
    function updateListener(force = false) {
        const p = session.pose, signature = [p.x, p.y, p.z, p.yaw].join(',');
        if (signature === listeningPose && !force) return;
        listeningPose = signature;
        if (context) {
            const listener = context.listener;
            const values = { positionX: p.x, positionY: p.y, positionZ: p.z, forwardX: -Math.sin(p.yaw), forwardY: 0, forwardZ: -Math.cos(p.yaw), upX: 0, upY: 1, upZ: 0 };
            if (listener.positionX) Object.entries(values).forEach(([key, value]) => listener[key].setTargetAtTime(value, context.currentTime, 0.05));
            else { listener.setPosition(p.x, p.y, p.z); listener.setOrientation(values.forwardX, 0, values.forwardZ, 0, 1, 0); }
        }
    }
    function clearInputs() { keys.clear(); walkPointers.clear(); drag = null; session.clear(); applyMix(); requestRender(); }
    function renderControls() {
        const mixing = session.mode === 'mix';
        document.body.dataset.experience = session.mode;
        document.body.classList.toggle('free-roam', session.free);
        document.querySelectorAll('[data-experience]').forEach(button => { if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset.experience === session.mode)); });
        document.querySelectorAll('[data-position]').forEach(button => button.setAttribute('aria-pressed', String(!session.free && button.dataset.position === session.position)));
        $('position-controls').hidden = session.mode !== 'explore';
        $('music-workspace').hidden = !mixing; $('listening-prompt').hidden = mixing;
        $('walk-panel').hidden = !session.free; $('free-move').setAttribute('aria-pressed', String(session.free));
        $('mix-owner').textContent = mixing ? 'Your mix' : 'Example mix';
        $('prompt-kicker').textContent = session.mode === 'explore' ? 'Change your perspective' : 'Listen for';
        $('prompt-title').textContent = session.mode === 'explore' ? 'The same music, another place' : 'A gesture comes forward';
        $('prompt-text').textContent = session.mode === 'explore' ? 'Compare the audience, clarinetist, and engineer positions without restarting. You can also move through the room.' : 'Hear the sound surrounding you, then notice a louder gesture appearing at one speaker.';
        $('map-legend').textContent = mixing ? (guide ? 'Light: sound at each speaker · solid ring: your foreground · dashed ring: example cue' : 'Light: sound at each speaker · solid ring: your foreground') : 'Speaker light follows the sound. A solid ring marks the foreground.';
        $('timeline-view').hidden = view !== 'timeline'; $('score-view').hidden = view !== 'score';
        $('cue-strip').hidden = !guide; $('music-workspace').classList.toggle('guide-hidden', !guide);
        document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
        $('input-help').textContent = session.inputStyle === 'hold' ? 'Hold keys 1–6 or touch pads to bring speakers forward. Release to return to the surrounding background.' : 'Tap a pad or press a key once to keep a speaker forward; press again to release. Release all returns to background.';
        updateListener(); applyMix(); requestRender();
    }
    function renderTransport() {
        const playing = !audio.paused && !audio.ended;
        $('play').textContent = playback.pending ? 'Cancel' : playing ? 'Pause' : 'Play';
        $('play').setAttribute('aria-label', playback.pending ? 'Cancel playback start' : playing ? 'Pause audio' : 'Play audio');
        $('source-state').textContent = playback.pending ? 'Loading audio…' : audio.ended ? 'Excerpt complete' : playing ? 'Playing · clarinetist silent' : 'Paused · clarinetist silent';
        $('elapsed').textContent = formatTime(audio.currentTime);
        $('duration').textContent = formatTime(audio.duration);
        if (Number.isFinite(audio.duration)) { $('seek').disabled = false; $('seek').max = audio.duration; $('seek').value = audio.currentTime; }
    }
    async function togglePlayback() {
        if (playback.wanted || !audio.paused) { playback.stop(); renderTransport(); requestRender(); return; }
        $('app-message').textContent = '';
        const starting = playback.start(); renderTransport();
        try { await starting; } catch (error) {
            $('app-message').textContent = 'Audio could not start. Check your connection and press Play to try again.';
            console.error('Playback failed', error);
        }
        renderTransport(); requestRender();
    }
    function buildControls() {
        C.speakers.forEach(s => {
            const pad = document.createElement('button'); pad.className = 'speaker-pad'; pad.dataset.speaker = s.id;
            pad.setAttribute('aria-label', `Speaker ${s.id}`); pad.setAttribute('aria-pressed', 'false');
            pad.innerHTML = `<strong>${s.id}</strong><output>50%</output><span class="meter" aria-hidden="true"></span>`;
            pad.addEventListener('pointerdown', e => { if (e.button !== 0) return; e.preventDefault(); pad.focus({ preventScroll: true }); pad.setPointerCapture(e.pointerId); session.press(`pointer:${e.pointerId}`, s.id); applyMix(); requestRender(); });
            const release = e => { session.release(`pointer:${e.pointerId}`); applyMix(); requestRender(); };
            ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => pad.addEventListener(name, release));
            // Assistive-technology activation has no pointerdown/keyup sequence.
            pad.addEventListener('click', e => { if (e.detail !== 0 || session.inputStyle !== 'latch') return; session.press(`activate:${s.id}`, s.id); session.release(`activate:${s.id}`); applyMix(); requestRender(); });
            $('speaker-pads').append(pad);
        });
    }
    function buildTimeline() {
        if (!Number.isFinite(audio.duration)) return;
        $('cue-timeline').replaceChildren();
        C.speakers.forEach(s => {
            const row = document.createElement('div'); row.className = 'cue-lane';
            const number = document.createElement('span'); number.textContent = s.id;
            const track = document.createElement('div'); track.className = 'lane-track';
            C.cues.forEach((cue, i) => {
                if (cue.speaker !== s.id || cue.time >= audio.duration) return;
                const region = document.createElement('span'); region.className = 'cue-region'; region.dataset.cue = i;
                region.style.left = `${cue.time / audio.duration * 100}%`;
                region.style.width = `${(Math.min(audio.duration, C.cues[i + 1]?.time ?? audio.duration) - cue.time) / audio.duration * 100}%`;
                track.append(region);
            });
            const head = document.createElement('span'); head.className = 'playhead'; track.append(head);
            row.append(number, track); $('cue-timeline').append(row);
        });
    }
    function paintMap() {
        const rect = canvas.getBoundingClientRect(); if (!rect.width || !rect.height) return;
        const dpr = Math.min(devicePixelRatio || 1, 2), w = rect.width, h = rect.height;
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
        draw.setTransform(dpr, 0, 0, dpr, 0, 0); draw.clearRect(0, 0, w, h);
        const scale = Math.min(w - 74, h - 65) / 14, cx = w / 2, cy = h / 2;
        const pos = p => [cx + p.x * scale, cy + p.z * scale];
        draw.strokeStyle = '#3f505e'; draw.lineWidth = 1; draw.beginPath(); draw.arc(cx, cy, 7 * scale, 0, Math.PI * 2); draw.stroke();
        const current = C.cueAt(audio.currentTime).current;
        C.speakers.forEach((s, i) => {
            const [x, y] = pos(s), selected = plannedGains[i] > 0.5;
            if (rms[i] > 0.002) { draw.fillStyle = `rgba(242,188,115,${Math.min(0.4, rms[i] * 4)})`; draw.beginPath(); draw.arc(x, y, 24 + Math.min(12, rms[i] * 75), 0, Math.PI * 2); draw.fill(); }
            draw.fillStyle = rms[i] > 0.008 ? '#d5a661' : '#263744'; draw.beginPath(); draw.arc(x, y, 17, 0, Math.PI * 2); draw.fill();
            if (selected) { draw.strokeStyle = '#f2bc73'; draw.lineWidth = 2; draw.beginPath(); draw.arc(x, y, 21, 0, Math.PI * 2); draw.stroke(); }
            if (session.mode === 'mix' && guide && current.speaker === s.id) { draw.setLineDash([3, 4]); draw.strokeStyle = '#90d9ef'; draw.lineWidth = 2; draw.beginPath(); draw.arc(x, y, 27, 0, Math.PI * 2); draw.stroke(); draw.setLineDash([]); }
            draw.fillStyle = rms[i] > 0.008 ? '#11171d' : '#edf0f2'; draw.font = '500 13px system-ui'; draw.textAlign = 'center'; draw.textBaseline = 'middle'; draw.fillText(s.id, x, y);
        });
        const [px, py] = pos(C.positions.clarinetist);
        draw.strokeStyle = '#db857c'; draw.lineWidth = 1; draw.beginPath(); draw.arc(px, py, 8, 0, Math.PI * 2); draw.stroke();
        draw.font = '11px system-ui'; draw.fillStyle = '#bdc7cf'; draw.fillText('Clarinetist · silent', px, py - 19);
        const p = session.pose, [lx, ly] = pos(p);
        draw.fillStyle = '#edf0f2'; draw.beginPath(); draw.arc(lx, ly, 5, 0, Math.PI * 2); draw.fill();
        draw.strokeStyle = '#edf0f2'; draw.lineWidth = 2; draw.beginPath(); draw.moveTo(lx, ly); draw.lineTo(lx - Math.sin(p.yaw) * 18, ly - Math.cos(p.yaw) * 18); draw.stroke();
        draw.font = '11px system-ui'; draw.fillText(session.free ? 'You' : C.positions[session.position].label, lx, ly + (session.position === 'clarinetist' ? 30 : 23));
    }
    function createRoom() {
        if (room) return true;
        if (!window.THREE) { $('app-message').textContent = 'The 3D view could not load. You can still compare all three listening positions.'; return false; }
        try {
            const T = window.THREE, scene = new T.Scene(); scene.background = new T.Color(0x101820);
            const camera = new T.PerspectiveCamera(75, 1, 0.1, 100);
            const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power' }); renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
            $('room-view').append(renderer.domElement); scene.add(new T.HemisphereLight(0xe5edf4, 0x323844, 1.6));
            const floor = new T.Mesh(new T.CircleGeometry(10, 64), new T.MeshStandardMaterial({ color: 0x202a32, roughness: 1 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
            scene.add(new T.GridHelper(20, 20, 0x465865, 0x2d3b45));
            function label(text, x, y, z) {
                const surface = document.createElement('canvas'); surface.width = 512; surface.height = 128;
                const brush = surface.getContext('2d'); brush.fillStyle = '#edf0f2'; brush.font = '42px sans-serif'; brush.textAlign = 'center'; brush.fillText(text, 256, 76);
                const sprite = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(surface), depthTest: false })); sprite.position.set(x, y, z); sprite.scale.set(2.6, 0.65, 1); scene.add(sprite);
            }
            const meshes = C.speakers.map(s => { const mesh = new T.Mesh(new T.BoxGeometry(0.55, 1.5, 0.45), new T.MeshStandardMaterial({ color: 0x607281 })); mesh.position.set(s.x, 0.75, s.z); scene.add(mesh); label(`Speaker ${s.id}`, s.x, 2, s.z); return mesh; });
            const person = new T.Mesh(new T.CylinderGeometry(0.18, 0.25, 1.65, 12), new T.MeshStandardMaterial({ color: 0xbe827b })); person.position.set(0, 0.825, -4.111); scene.add(person); label('Clarinetist · silent', 0, 2.2, -4.111);
            room = { scene, camera, renderer, meshes }; return true;
        } catch (error) { $('app-message').textContent = '3D is unavailable on this device. Listening positions and the room map still work.'; console.warn(error); return false; }
    }
    function paintRoom() {
        if (!session.free || !room) return;
        const el = $('room-view'), w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        if (room.width !== w || room.height !== h) {
            room.renderer.setSize(w, h, false); room.camera.aspect = w / h; room.camera.updateProjectionMatrix();
            room.width = w; room.height = h;
        }
        const p = session.pose; room.camera.position.set(p.x, p.y, p.z); room.camera.lookAt(p.x - Math.sin(p.yaw), p.y, p.z - Math.cos(p.yaw));
        room.meshes.forEach((mesh, i) => { mesh.material.color.setHex(rms[i] > 0.008 ? 0xd4a565 : 0x607281); });
        room.renderer.render(room.scene, room.camera);
    }
    function requestRender() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
    function frame(now) {
        raf = 0; const dt = Math.min(0.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
        const walking = new Set([...keys, ...walkPointers.values()]);
        if (session.free) { session.move(Number(walking.has('w') || walking.has('forward')) - Number(walking.has('s') || walking.has('back')), Number(walking.has('d') || walking.has('right')) - Number(walking.has('a') || walking.has('left')), Number(walking.has('j') || walking.has('turn-left')) - Number(walking.has('l') || walking.has('turn-right')), dt); updateListener(); }
        applyMix();
        const active = !audio.paused && !audio.ended;
        channels.forEach((channel, i) => { if (!active) { rms[i] = 0; return; } channel.meter.getFloatTimeDomainData(channel.samples); rms[i] = Math.sqrt(channel.samples.reduce((sum, n) => sum + n * n, 0) / channel.samples.length); });
        if (!active) rms.fill(0);
        $('source-dot').classList.toggle('sounding', active && rms.some(n => n > 0.002));
        const cue = C.cueAt(audio.currentTime);
        if (cue.index !== lastCue) { lastCue = cue.index; $('current-cue').textContent = cueName(cue.current); $('next-cue').textContent = cue.next ? cueName(cue.next) : 'End of excerpt'; }
        $('next-time').textContent = cue.next ? `in ${Math.max(0, cue.next.time - audio.currentTime).toFixed(1)} s` : '';
        const fraction = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration * 100 : 0;
        document.querySelectorAll('.playhead').forEach(head => { head.style.left = `${fraction}%`; });
        document.querySelectorAll('.cue-region').forEach(region => region.classList.toggle('current', Number(region.dataset.cue) === cue.index));
        document.querySelectorAll('.speaker-pad').forEach((pad, i) => { pad.classList.toggle('expected', guide && cue.current.speaker === i + 1); pad.querySelector('.meter').style.width = `${Math.min(100, rms[i] * 400)}%`; });
        const selected = plannedGains.map((n, i) => n > 0.5 ? i + 1 : null).filter(Boolean);
        $('level-summary').textContent = `${session.mode === 'mix' ? 'Your mix' : 'Example mix'} · ${selected.length ? 'foreground: ' + selected.join(', ') : 'surrounding background'}`;
        paintMap(); paintRoom(); renderTransport();
        if (active || (session.free && walking.size)) requestRender();
    }
    buildControls();
    document.querySelectorAll('button[data-experience]').forEach(button => button.addEventListener('click', () => { clearInputs(); session.setMode(button.dataset.experience); renderControls(); }));
    document.querySelectorAll('[data-position]').forEach(button => button.addEventListener('click', () => { clearInputs(); session.free = false; session.setPosition(button.dataset.position); renderControls(); }));
    $('free-move').addEventListener('click', () => { clearInputs(); if (session.free) session.free = false; else if (createRoom()) session.free = true; renderControls(); });
    document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { view = button.dataset.view; renderControls(); }));
    $('cue-guide').addEventListener('change', () => { guide = $('cue-guide').checked; renderControls(); });
    $('input-style').addEventListener('change', () => { clearInputs(); session.setInputStyle($('input-style').value); renderControls(); });
    $('release-speakers').addEventListener('click', clearInputs);
    $('play').addEventListener('click', togglePlayback);
    $('restart').addEventListener('click', () => { clearInputs(); audio.currentTime = 0; applyMix(); renderTransport(); requestRender(); });
    $('seek').addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(audio.duration, Math.max(0, Number($('seek').value))); applyMix(); requestRender(); });
    $('volume').addEventListener('input', () => { if (master) master.gain.setTargetAtTime(Number($('volume').value) / 300, context.currentTime, 0.03); });
    $('score-zoom').addEventListener('input', () => { $('full-score').style.width = `${$('score-zoom').value}%`; $('score-zoom-value').textContent = `${$('score-zoom').value}%`; });
    function editing(event) { return event.ctrlKey || event.metaKey || event.altKey || Boolean(event.target.closest('input,select,textarea,[contenteditable="true"],summary')); }
    document.addEventListener('keydown', event => {
        if (editing(event)) return;
        const key = event.key.toLowerCase();
        if (session.mode === 'mix') {
            const pad = event.target.closest('.speaker-pad');
            const speaker = speakerKeys[key] || (pad && [' ', 'enter'].includes(key) ? Number(pad.dataset.speaker) : null);
            if (speaker) { event.preventDefault(); if (!event.repeat) session.press(`key:${key}`, speaker); applyMix(); requestRender(); }
        } else if (session.free && ['w', 'a', 's', 'd', 'j', 'l'].includes(key)) { event.preventDefault(); keys.add(key); requestRender(); }
    });
    document.addEventListener('keyup', event => { const key = event.key.toLowerCase(); session.release(`key:${key}`); keys.delete(key); applyMix(); requestRender(); });
    document.querySelectorAll('[data-walk]').forEach(button => { button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); walkPointers.set(event.pointerId, button.dataset.walk); requestRender(); }); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => button.addEventListener(name, event => walkPointers.delete(event.pointerId))); });
    $('room-view').addEventListener('pointerdown', event => { if (!session.free) return; drag = { id: event.pointerId, x: event.clientX }; $('room-view').setPointerCapture(event.pointerId); });
    $('room-view').addEventListener('pointermove', event => { if (drag?.id !== event.pointerId) return; session.pose.yaw -= (event.clientX - drag.x) * 0.006; drag.x = event.clientX; updateListener(); requestRender(); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => $('room-view').addEventListener(name, () => { drag = null; }));
    window.addEventListener('blur', clearInputs); document.addEventListener('visibilitychange', () => { clearInputs(); if (!document.hidden) requestRender(); });
    window.addEventListener('pagehide', () => { clearInputs(); playback.stop(); });
    audio.addEventListener('loadedmetadata', () => { buildTimeline(); renderTransport(); requestRender(); });
    audio.addEventListener('durationchange', () => { buildTimeline(); renderTransport(); requestRender(); });
    ['play', 'playing', 'pause', 'seeked', 'timeupdate'].forEach(name => audio.addEventListener(name, () => { renderTransport(); requestRender(); }));
    audio.addEventListener('ended', () => { playback.stop(); clearInputs(); renderTransport(); });
    audio.addEventListener('error', () => { playback.stop(); $('app-message').textContent = 'The recording could not load. Check your connection and reload this preview.'; renderTransport(); });
    const resize = new ResizeObserver(requestRender); resize.observe(canvas.parentElement); resize.observe($('room-view'));
    renderControls(); renderTransport(); if (audio.readyState >= 1) buildTimeline();
})();
