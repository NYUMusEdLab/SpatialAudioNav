/* Preview 06: a single-excerpt study with one shared media clock. */
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
    let context, master, sourceMeter, sourceSamples, channels = [], setupPromise, raf = 0, lastFrame = 0;
    let view = 'timeline', guide = true, room, drag = null, lastCue = -1;
    let roomView = 'whole', orbitYaw = 0;
    let plannedGains = [], listeningPose = '', automationMode = '';
    let backgroundRms = 0;
    const accentLights = Array(6).fill(0);
    const rms = Array(6).fill(0);
    const feedback = Array.from({length:6}, () => C.speakerFeedback(0, 0, false));
    const formatTime = value => Number.isFinite(value) ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}` : '—';
    const cueName = cue => cue?.speaker ? `Speaker ${cue.speaker} accent` : 'Surrounding background';

    async function prepareAudio() {
        if (!setupPromise) setupPromise = (async () => {
            context = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
            const source = context.createMediaElementSource(audio);
            sourceMeter = context.createAnalyser(); sourceMeter.fftSize = 1024;
            sourceSamples = new Float32Array(sourceMeter.fftSize); source.connect(sourceMeter);
            master = context.createGain(); master.gain.value = Number($('volume').value) / 300;
            master.connect(context.destination);
            channels = C.speakers.map(s => {
                const gain = context.createGain();
                const meter = context.createAnalyser(); meter.fftSize = 1024;
                const panner = context.createPanner();
                panner.panningModel = 'HRTF'; panner.distanceModel = 'inverse';
                panner.refDistance = 2; panner.maxDistance = 100;
                panner.positionX.value = s.x; panner.positionY.value = s.y; panner.positionZ.value = s.z;
                gain.gain.value = session.gains(audio.currentTime)[s.id - 1];
                sourceMeter.connect(gain); gain.connect(meter); meter.connect(panner); panner.connect(master);
                return { gain, meter, samples: new Float32Array(meter.fftSize) };
            });
            plannedGains = []; applyMix(true); updateListener(true);
        })();
        await setupPromise;
        if (context.state === 'suspended') await context.resume();
    }
    const playback = new C.Playback(audio, prepareAudio);
    function scheduleExample() {
        if (!context) return;
        const time = audio.currentTime, now = context.currentTime;
        const levels = C.referenceLevels(time);
        channels.forEach((channel, i) => {
            const param = channel.gain.gain;
            param.cancelScheduledValues(now); param.setValueAtTime(levels[i], now);
            if (audio.paused || audio.ended) return;
            // Resume the current exponential segment, then schedule every attack/release.
            const target = C.referenceGains(time)[i];
            param.setTargetAtTime(target, now, (target > 0.5 ? C.attack : C.release) / audio.playbackRate);
            C.cues.filter(cue => cue.time > time).forEach(cue => {
                const next = cue.speaker === i + 1 ? 1 : 0.5;
                param.setTargetAtTime(next, now + (cue.time - time) / audio.playbackRate,
                    (next > 0.5 ? C.attack : C.release) / audio.playbackRate);
            });
        });
    }
    function applyMix(force = false) {
        const values = session.gains(audio.currentTime);
        const mode = session.mode === 'mix' ? 'manual' : 'example';
        if (context && mode === 'example' && (force || automationMode !== mode)) scheduleExample();
        if (mode === 'manual') channels.forEach((channel, i) => {
            if (!force && automationMode === mode && plannedGains[i] === values[i]) return;
            const param = channel.gain.gain, now = context.currentTime, current = param.value;
            param.cancelScheduledValues(now); param.setValueAtTime(current, now);
            param.setTargetAtTime(values[i], now, values[i] > current ? C.attack : C.release);
        });
        automationMode = mode;
        plannedGains = values;
        document.querySelectorAll('.speaker-pad').forEach((pad, i) => {
            pad.setAttribute('aria-pressed', String(session.selected().has(i + 1)));
            pad.querySelector('output').textContent = values[i] > 0.5 ? 'Boosted' : 'Background';
        });
        const selected = [...session.selected()].sort();
        $('mix-status').textContent = selected.length ? `${session.inputStyle === 'latch' ? 'Boost latched' : 'Boost held'}: ${selected.map(n => `speaker ${n}`).join(', ')}` : 'Background only · no speakers boosted';
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
        document.querySelectorAll('[data-position]').forEach(button => button.setAttribute('aria-pressed', String(!session.free && !session.customPosition && button.dataset.position === session.position)));
        $('position-controls').hidden = session.mode !== 'explore';
        $('music-workspace').hidden = !mixing; $('listening-prompt').hidden = mixing;
        $('walk-panel').hidden = !session.free; renderRoomControls(); $('free-move').setAttribute('aria-pressed', String(session.free));
        $('mix-owner').textContent = mixing ? 'Your mix' : 'Example mix';
        $('prompt-kicker').textContent = session.mode === 'explore' ? 'Change your perspective' : 'Listen for';
        $('prompt-title').textContent = session.mode === 'explore' ? 'The same music, another place' : 'A gesture comes forward';
        $('prompt-text').textContent = session.mode === 'explore' ? 'Compare the audience, clarinetist, and engineer positions without restarting. You can also move through the room.' : 'Hear the sound surrounding you, then notice a brief louder gesture at one speaker, followed by a return to the surrounding sound.';
        $('map-legend').textContent = mixing ? (guide ? 'Grey: speaker volume · amber: accent · white outline: selected pad · dashed blue: example cue' : 'Grey: speaker volume · amber: accent · white outline: selected pad') : 'Grey circles follow each speaker’s sound. Amber pulses show accents above the surrounding background.';
        $('timeline-view').hidden = view !== 'timeline'; $('score-view').hidden = view !== 'score';
        $('cue-strip').hidden = !guide; $('music-workspace').classList.toggle('guide-hidden', !guide);
        document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
        $('input-help').textContent = session.inputStyle === 'hold' ? 'Hold 1–6 or a pad to boost. Release to fade back; the background keeps playing.' : 'Tap keys 1–6 or pads to latch a boost. Tap again or Release all to return to background.';
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
            pad.innerHTML = `<strong>${s.id}</strong><output>Background</output><span class="meter" aria-hidden="true"></span>`;
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
            C.accents.forEach(accent => {
                if (accent.speaker !== s.id || accent.start >= audio.duration) return;
                const region = document.createElement('span'); region.className = 'cue-region'; region.dataset.cue = accent.cueIndex;
                region.style.left = `${accent.start / audio.duration * 100}%`;
                region.style.width = `${(Math.min(audio.duration, accent.end) - accent.start) / audio.duration * 100}%`;
                region.title = `Speaker ${s.id}: ${accent.start.toFixed(3)}–${accent.end.toFixed(3)} s, then release`;
                const tail = document.createElement('span'); tail.className = 'cue-tail';
                tail.style.left = `${accent.end / audio.duration * 100}%`;
                tail.style.width = `${Math.min(C.release * 4, audio.duration - accent.end) / audio.duration * 100}%`;
                track.append(tail);
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
        const bedLight = Math.min(1, Math.sqrt(backgroundRms * 12));
        draw.strokeStyle = `rgba(144,217,239,${0.18 + bedLight * 0.55})`; draw.lineWidth = 1 + bedLight * 3; draw.beginPath(); draw.arc(cx, cy, 7 * scale, 0, Math.PI * 2); draw.stroke();
        const current = C.cueAt(audio.currentTime).current;
        C.speakers.forEach((s, i) => {
            const [x, y] = pos(s), meter = feedback[i], light = meter.accent;
            if (meter.level > 0) {
                draw.fillStyle = `rgba(192,199,205,${meter.opacity * 0.3})`;
                draw.strokeStyle = `rgba(210,216,221,${meter.opacity * 0.55})`; draw.lineWidth = 1;
                draw.beginPath(); draw.arc(x, y, meter.radius, 0, Math.PI * 2); draw.fill(); draw.stroke();
            }
            draw.fillStyle = '#263744';
            draw.beginPath(); draw.arc(x, y, 17, 0, Math.PI * 2); draw.fill();
            if (light > 0) {
                draw.fillStyle = `rgba(242,188,115,${light * 0.45})`;
                draw.beginPath(); draw.arc(x, y, meter.accentRadius, 0, Math.PI * 2); draw.fill();
                draw.strokeStyle = `rgba(242,188,115,${light})`; draw.lineWidth = 1 + light * 4;
                draw.beginPath(); draw.arc(x, y, meter.accentRadius, 0, Math.PI * 2); draw.stroke();
            }
            if (session.mode === 'mix' && session.selected().has(s.id)) {
                draw.strokeStyle = '#d8e2e8'; draw.lineWidth = 1;
                draw.beginPath(); draw.arc(x, y, 21, 0, Math.PI * 2); draw.stroke();
            }
            if (session.mode === 'mix' && guide && current.speaker === s.id) { draw.setLineDash([3, 4]); draw.strokeStyle = '#90d9ef'; draw.lineWidth = 2; draw.beginPath(); draw.arc(x, y, 27, 0, Math.PI * 2); draw.stroke(); draw.setLineDash([]); }
            draw.fillStyle = '#edf0f2'; draw.font = '500 13px system-ui'; draw.textAlign = 'center'; draw.textBaseline = 'middle'; draw.fillText(s.id, x, y);
        });
        const [px, py] = pos(C.positions.clarinetist);
        draw.strokeStyle = '#db857c'; draw.lineWidth = 1; draw.beginPath(); draw.arc(px, py, 8, 0, Math.PI * 2); draw.stroke();
        draw.font = '11px system-ui'; draw.fillStyle = '#bdc7cf'; draw.fillText('Clarinetist · silent', px, py - 19);
        const p = session.pose, [lx, ly] = pos(p);
        draw.fillStyle = '#edf0f2'; draw.beginPath(); draw.arc(lx, ly, 5, 0, Math.PI * 2); draw.fill();
        draw.strokeStyle = '#edf0f2'; draw.lineWidth = 2; draw.beginPath(); draw.moveTo(lx, ly); draw.lineTo(lx - Math.sin(p.yaw) * 18, ly - Math.cos(p.yaw) * 18); draw.stroke();
        draw.font = '11px system-ui'; draw.fillText(session.free || session.customPosition ? 'You' : C.positions[session.position].label, lx, ly + (session.position === 'clarinetist' ? 30 : 23));
    }
    function createRoom() {
        if (room) return true;
        if (!window.THREE) { $('app-message').textContent = 'The 3D view could not load. You can still compare all three listening positions.'; return false; }
        try {
            const T = window.THREE, scene = new T.Scene(); scene.background = new T.Color(0x101820);
            const camera = new T.PerspectiveCamera(75, 1, 0.1, 100);
            const overview = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
            const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power' }); renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
            $('room-view').append(renderer.domElement); scene.add(new T.HemisphereLight(0xe5edf4, 0x323844, 1.6));
            const floor = new T.Mesh(new T.CircleGeometry(10, 64), new T.MeshStandardMaterial({ color: 0x202a32, roughness: 1 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
            scene.add(new T.GridHelper(20, 20, 0x465865, 0x2d3b45));
            const labels = [];
            const meshes = C.speakers.map(s => {
                const mesh = new T.Mesh(new T.BoxGeometry(0.55, 1.5, 0.45), new T.MeshStandardMaterial({ color: 0x607281 }));
                mesh.position.set(s.x, 0.75, s.z); scene.add(mesh);
                const chip = document.createElement('span'); chip.className = 'room-speaker-chip'; chip.textContent = s.id; chip.setAttribute('aria-hidden', 'true'); $('room-view').append(chip);
                labels.push({chip, point:new T.Vector3(s.x, 2.2, s.z)}); return mesh;
            });
            const person = new T.Mesh(new T.CylinderGeometry(0.18, 0.25, 1.65, 12), new T.MeshStandardMaterial({ color: 0xbe827b })); person.position.set(0, 0.825, -4.111); scene.add(person);
            const listenerMarker = new T.Group();
            const point = new T.Mesh(new T.SphereGeometry(0.22, 16, 12), new T.MeshBasicMaterial({color:0xffffff})); point.position.y = 0.3; listenerMarker.add(point);
            const direction = new T.ArrowHelper(new T.Vector3(0, 0, -1), new T.Vector3(0, 0.15, 0), 1.2, 0xffffff, 0.35, 0.25); listenerMarker.add(direction); scene.add(listenerMarker);
            room = { scene, camera, overview, renderer, meshes, labels, listenerMarker,
                raycaster: new T.Raycaster(), floorPlane: new T.Plane(new T.Vector3(0, 1, 0), 0) }; return true;
        } catch (error) { $('app-message').textContent = '3D is unavailable on this device. Listening positions and the room map still work.'; console.warn(error); return false; }
    }
    function renderRoomControls() {
        document.querySelectorAll('[data-room-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.roomView === roomView)));
        $('room-help').textContent = roomView === 'whole' ? 'Tap the floor to move your listening point. Drag to rotate the view.' : 'Drag to turn your head. Hold the arrows to move. Whole room shows where you are.';
        $('room-legend').textContent = roomView === 'whole' ? 'White marker: you · red marker: clarinetist' : 'Your listening point · red marker: clarinetist';
        $('room-view').dataset.view = roomView;
    }
    function closeRoom() {
        clearInputs(); session.free = false; renderControls(); $('free-move').focus();
    }
    function paintRoom() {
        if (!session.free || !room) return;
        const el = $('room-view'), w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        const ratio = Math.min(devicePixelRatio || 1, 2);
        if (room.width !== w || room.height !== h || room.pixelRatio !== ratio) {
            room.renderer.setPixelRatio(ratio); room.renderer.setSize(w, h, false);
            room.camera.aspect = w / h; room.camera.fov = C.eyeFov(w / h); room.camera.updateProjectionMatrix();
            const bounds = C.overviewBounds(w / h);
            Object.assign(room.overview, {left:-bounds.halfWidth,right:bounds.halfWidth,top:bounds.halfHeight,bottom:-bounds.halfHeight});
            room.overview.updateProjectionMatrix();
            room.width = w; room.height = h; room.pixelRatio = ratio;
        }
        const p = session.pose;
        room.camera.position.set(p.x, p.y, p.z); room.camera.lookAt(p.x - Math.sin(p.yaw), p.y, p.z - Math.cos(p.yaw));
        room.overview.position.set(Math.sin(orbitYaw) * 18, 22, Math.cos(orbitYaw) * 18); room.overview.lookAt(0, 0, 0);
        room.listenerMarker.position.set(p.x, 0, p.z); room.listenerMarker.rotation.y = p.yaw;
        room.listenerMarker.visible = roomView === 'whole';
        room.meshes.forEach((mesh, i) => { mesh.material.color.setRGB(0.2 + accentLights[i] * 0.65, 0.28 + accentLights[i] * 0.25, 0.33 - accentLights[i] * 0.2); });
        const activeCamera = roomView === 'whole' ? room.overview : room.camera;
        room.renderer.render(room.scene, activeCamera);
        room.labels.forEach(({chip, point}, i) => {
            const screen = point.clone().project(activeCamera);
            chip.hidden = Math.abs(screen.x) > 0.94 || Math.abs(screen.y) > 0.94 || screen.z < -1 || screen.z > 1;
            chip.style.left = `${(screen.x + 1) / 2 * w}px`; chip.style.top = `${(1 - screen.y) / 2 * h}px`;
            const meter = feedback[i];
            chip.style.setProperty('--volume-size', `${meter.radius * 2}px`);
            chip.style.setProperty('--volume-opacity', meter.opacity.toFixed(3));
            chip.style.setProperty('--accent-size', `${meter.accentRadius * 2}px`);
            chip.style.setProperty('--accent-opacity', meter.accent.toFixed(3));
            chip.dataset.level = meter.level.toFixed(3);
            chip.classList.toggle('accent', meter.accent > 0.15);
        });
        el.dataset.listener = [p.x, p.z, p.yaw].map(n => n.toFixed(2)).join(',');
    }
    function placeListener(event) {
        if (!room || roomView !== 'whole') return;
        const rect = $('room-view').getBoundingClientRect();
        const point = new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
        room.raycaster.setFromCamera(point, room.overview);
        const location = room.raycaster.ray.intersectPlane(room.floorPlane, new THREE.Vector3());
        if (location) { session.moveTo(location.x, location.z); updateListener(); requestRender(); }
    }
    function requestRender() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
    function frame(now) {
        raf = 0; const dt = Math.min(0.05, (now - (lastFrame || now)) / 1000); lastFrame = now;
        const walking = new Set([...keys, ...walkPointers.values()]);
        if (session.free) { session.move(Number(walking.has('w') || walking.has('forward')) - Number(walking.has('s') || walking.has('back')), Number(walking.has('d') || walking.has('right')) - Number(walking.has('a') || walking.has('left')), Number(walking.has('j') || walking.has('turn-left')) - Number(walking.has('l') || walking.has('turn-right')), dt); updateListener(); }
        applyMix();
        const active = !audio.paused && !audio.ended;
        channels.forEach((channel, i) => { if (!active) { rms[i] = 0; return; } channel.meter.getFloatTimeDomainData(channel.samples); rms[i] = Math.sqrt(channel.samples.reduce((sum, n) => sum + n * n, 0) / channel.samples.length); });
        if (active && sourceMeter) {
            sourceMeter.getFloatTimeDomainData(sourceSamples);
            backgroundRms = 0.5 * Math.sqrt(sourceSamples.reduce((sum, n) => sum + n * n, 0) / sourceSamples.length);
        } else { rms.fill(0); backgroundRms = 0; }
        feedback.forEach((_, i) => { feedback[i] = C.speakerFeedback(rms[i], backgroundRms, active); accentLights[i] = feedback[i].accent; });
        $('source-dot').classList.toggle('sounding', active && rms.some(n => n > 0.002));
        const cue = C.cueAt(audio.currentTime);
        if (cue.index !== lastCue) { lastCue = cue.index; $('current-cue').textContent = cueName(cue.current); $('next-cue').textContent = cue.next ? (cue.next.releasedSpeaker ? 'Return to background' : cueName(cue.next)) : 'Background to the end'; }
        $('next-time').textContent = cue.next ? `in ${Math.max(0, cue.next.time - audio.currentTime).toFixed(1)} s` : '';
        const fraction = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.currentTime / audio.duration * 100 : 0;
        document.querySelectorAll('.playhead').forEach(head => { head.style.left = `${fraction}%`; });
        document.querySelectorAll('.cue-region').forEach(region => region.classList.toggle('current', Number(region.dataset.cue) === cue.index));
        document.querySelectorAll('.speaker-pad').forEach((pad, i) => { pad.classList.toggle('expected', guide && cue.current.speaker === i + 1); pad.querySelector('.meter').style.width = `${Math.min(100, rms[i] * 400)}%`; });
        const selected = plannedGains.map((n, i) => n > 0.5 ? i + 1 : null).filter(Boolean);
        const returning = channels.map((channel, i) => channel.gain.gain.value > 0.52 && !selected.includes(i + 1) ? i + 1 : null).filter(Boolean);
        const summary = selected.length ? `accent at ${selected.join(', ')}` : returning.length && active ? `speaker ${returning.join(', ')} returning to background` : 'surrounding background';
        $('level-summary').textContent = `${active ? '' : 'Paused · '}${session.mode === 'mix' ? 'your mix' : 'example mix'} · ${summary}`;
        canvas.dataset.accentSpeakers = accentLights.map((n, i) => n > 0.08 ? i + 1 : null).filter(Boolean).join(',');
        canvas.dataset.levels = feedback.map(meter => meter.level.toFixed(3)).join(',');
        paintMap(); paintRoom(); renderTransport();
        if (active || (session.free && walking.size)) requestRender();
    }
    buildControls();
    document.querySelectorAll('button[data-experience]').forEach(button => button.addEventListener('click', () => { clearInputs(); session.setMode(button.dataset.experience); renderControls(); }));
    document.querySelectorAll('[data-position]').forEach(button => button.addEventListener('click', () => { clearInputs(); session.free = false; session.setPosition(button.dataset.position); renderControls(); }));
    $('free-move').addEventListener('click', () => {
        clearInputs();
        if (createRoom()) { session.free = true; roomView = 'whole'; orbitYaw = 0; renderControls(); $('close-room').focus(); }
    });
    $('close-room').addEventListener('click', closeRoom);
    $('reset-room').addEventListener('click', () => { clearInputs(); session.setPosition('audience'); orbitYaw = 0; roomView = 'whole'; renderRoomControls(); updateListener(); requestRender(); });
    document.querySelectorAll('[data-room-view]').forEach(button => button.addEventListener('click', () => { clearInputs(); roomView = button.dataset.roomView; renderRoomControls(); requestRender(); }));
    document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => { view = button.dataset.view; renderControls(); }));
    $('cue-guide').addEventListener('change', () => { guide = $('cue-guide').checked; renderControls(); });
    $('input-style').addEventListener('change', () => { clearInputs(); session.setInputStyle($('input-style').value); renderControls(); });
    $('release-speakers').addEventListener('click', clearInputs);
    $('play').addEventListener('click', togglePlayback);
    $('restart').addEventListener('click', () => { clearInputs(); audio.currentTime = 0; applyMix(true); renderTransport(); requestRender(); });
    $('seek').addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(audio.duration, Math.max(0, Number($('seek').value))); applyMix(true); requestRender(); });
    $('volume').addEventListener('input', () => { if (master) master.gain.setTargetAtTime(Number($('volume').value) / 300, context.currentTime, 0.03); });
    $('score-zoom').addEventListener('input', () => { $('full-score').style.width = `${$('score-zoom').value}%`; $('score-zoom-value').textContent = `${$('score-zoom').value}%`; });
    // Range controls keep their native arrow keys, but do not swallow speaker
    // number shortcuts after the listener seeks or adjusts volume/score zoom.
    function editing(event) { return event.ctrlKey || event.metaKey || event.altKey || Boolean(event.target.closest('input:not([type="range"]),select,textarea,[contenteditable="true"],summary')); }
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && session.free) { event.preventDefault(); closeRoom(); return; }
        if (editing(event)) return;
        const key = event.key.toLowerCase();
        if (session.mode === 'mix') {
            const pad = event.target.closest('.speaker-pad');
            const speaker = speakerKeys[key] || (pad && [' ', 'enter'].includes(key) ? Number(pad.dataset.speaker) : null);
            if (speaker) { event.preventDefault(); if (!event.repeat) session.press(`key:${key}`, speaker); applyMix(); requestRender(); }
        } else if (session.free && ['w', 'a', 's', 'd', 'j', 'l'].includes(key)) { event.preventDefault(); keys.add(key); requestRender(); }
    });
    document.addEventListener('keyup', event => { const key = event.key.toLowerCase(); session.release(`key:${key}`); keys.delete(key); applyMix(); requestRender(); });
    document.querySelectorAll('[data-walk]').forEach(button => {
        button.addEventListener('pointerdown', event => { if (event.button !== 0 || !session.free) return; event.preventDefault(); button.setPointerCapture(event.pointerId); walkPointers.set(event.pointerId, button.dataset.walk); requestRender(); });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => button.addEventListener(name, event => walkPointers.delete(event.pointerId)));
        button.addEventListener('click', event => {
            if (event.detail !== 0) return;
            const motion = button.dataset.walk;
            session.move(Number(motion === 'forward') - Number(motion === 'back'), Number(motion === 'right') - Number(motion === 'left'), Number(motion === 'turn-left') - Number(motion === 'turn-right'), 0.25);
            updateListener(); requestRender();
        });
    });
    $('room-view').addEventListener('pointerdown', event => {
        if (!session.free || event.button !== 0 || drag) return;
        drag = { id:event.pointerId, x:event.clientX, startX:event.clientX, startY:event.clientY, moved:false };
        $('room-view').setPointerCapture(event.pointerId);
    });
    $('room-view').addEventListener('pointermove', event => {
        if (drag?.id !== event.pointerId) return;
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 8) drag.moved = true;
        if (drag.moved) {
            const change = (event.clientX - drag.x) / Math.max(240, $('room-view').clientWidth) * Math.PI * 1.5;
            if (roomView === 'whole') orbitYaw -= change;
            else { session.pose.yaw -= change; session.customPosition = true; updateListener(); }
            requestRender();
        }
        drag.x = event.clientX;
    });
    $('room-view').addEventListener('pointerup', event => { if (drag?.id !== event.pointerId) return; const tap = !drag.moved; drag = null; if (tap) placeListener(event); });
    ['pointercancel', 'lostpointercapture'].forEach(name => $('room-view').addEventListener(name, event => { if (drag?.id === event.pointerId) drag = null; }));
    window.addEventListener('blur', clearInputs); document.addEventListener('visibilitychange', () => { clearInputs(); if (!document.hidden) requestRender(); });
    window.addEventListener('pagehide', () => { clearInputs(); playback.stop(); });
    audio.addEventListener('loadedmetadata', () => { buildTimeline(); renderTransport(); requestRender(); });
    audio.addEventListener('durationchange', () => { buildTimeline(); renderTransport(); requestRender(); });
    ['play', 'playing', 'pause', 'seeked', 'ratechange'].forEach(name => audio.addEventListener(name, () => { applyMix(true); renderTransport(); requestRender(); }));
    audio.addEventListener('timeupdate', () => { renderTransport(); requestRender(); });
    audio.addEventListener('ended', () => { playback.stop(); clearInputs(); renderTransport(); });
    audio.addEventListener('error', () => { playback.stop(); $('app-message').textContent = 'The recording could not load. Check your connection and reload this preview.'; renderTransport(); });
    const resize = new ResizeObserver(requestRender); resize.observe(canvas.parentElement); resize.observe($('room-view'));
    renderControls(); renderTransport(); if (audio.readyState >= 1) buildTimeline();
})();
