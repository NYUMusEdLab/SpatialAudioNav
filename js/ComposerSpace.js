const DEG2RAD = Math.PI / 180;

/**
 * SpatialComposer orchestrates the Spatial Atelier workstation.
 * Feature highlights include:
 *  1. Free-flight WASD/QE/Space navigation with adjustable speed.
 *  2. Mouse look with yaw/pitch limits and focus glide targets.
 *  3. Coordinate entry faders with validation and sphere clamping.
 *  4. Random coordinate scatter and grid snapping toggle.
 *  5. Axis mirroring shortcuts for symmetric placement.
 *  6. Custom labeling for every resonance.
 *  7. Waveform palette (sine/triangle/saw/square/noise).
 *  8. Scale-aware pitch quantization across multiple modal palettes.
 *  9. Per-note intensity, duration, attack, release, and delay envelopes.
 * 10. Vibrato depth/rate modulation routing.
 * 11. Multi-mode filter with cutoff/Q sculpting.
 * 12. Spatial reverb send control with dedicated feedback loop.
 * 13. Sphere rotation slider with auto-spin latch.
 * 14. Timeline spacing control for rhythmic density.
 * 15. Loop, shuffle, and scatter utilities.
 * 16. Snapshot save/load banks (three slots).
 * 17. JSON layout export for archival.
 * 18. Offline WAV rendering for downloadable mixes.
 * 19. Live audition preview with independent AudioContext.
 * 20. Per-note mute/solo/duplicate/remove actions.
 * 21. Camera focus to individual notes or origin reset.
 * 22. Dynamic status console with emphasis state.
 * 23. Rotation slider sync while auto-spinning.
 * 24. Position-aware pan and distance gain mapping.
 * 25. Vibrant note meshes with colorized altitude feedback.
 * 26. Snapshot-aware restoration of envelopes/effects.
 * 27. Mirrored duplication with safe sphere clamping.
 * 28. Layout export/import ready data structures.
 * 29. Visibility guardrails for hidden UI while inactive.
 * 30. Automatic resource cleanup for preview/live contexts.
 */

class SpatialComposer {
    constructor() {
        this.root = document.getElementById('composer-space');
        this.sceneContainer = document.getElementById('composer-scene');
        this.enterBtn = document.getElementById('enterComposerSpace');
        this.exitBtn = document.getElementById('exitComposerSpace');
        this.addNoteBtn = document.getElementById('addNoteBtn');
        this.playBtn = document.getElementById('playCompositionBtn');
        this.stopBtn = document.getElementById('stopCompositionBtn');
        this.saveBtn = document.getElementById('saveCompositionBtn');
        this.autoSpinBtn = document.getElementById('autoSpinBtn');
        this.rotationSlider = document.getElementById('sphereRotationSlider');
        this.statusEl = document.getElementById('composer-status');
        this.noteListEl = document.getElementById('composer-noteList');
        this.coordInputs = {
            x: document.getElementById('coordX'),
            y: document.getElementById('coordY'),
            z: document.getElementById('coordZ')
        };
        this.coordLabelInput = document.getElementById('coordLabel');
        this.randomizeBtn = document.getElementById('randomizeCoordsBtn');
        this.snapToggleBtn = document.getElementById('snapToggle');
        this.mirrorButtons = {
            x: document.getElementById('mirrorXBtn'),
            y: document.getElementById('mirrorYBtn'),
            z: document.getElementById('mirrorZBtn')
        };
        this.waveformSelect = document.getElementById('waveformSelect');
        this.scaleSelect = document.getElementById('scaleSelect');
        this.noteVolumeSlider = document.getElementById('noteVolume');
        this.noteDurationSlider = document.getElementById('noteDuration');
        this.attackSlider = document.getElementById('attackSlider');
        this.releaseSlider = document.getElementById('releaseSlider');
        this.noteDelaySlider = document.getElementById('noteDelay');
        this.vibratoDepthSlider = document.getElementById('vibratoDepth');
        this.vibratoRateSlider = document.getElementById('vibratoRate');
        this.filterTypeSelect = document.getElementById('filterType');
        this.filterFrequencySlider = document.getElementById('filterFrequency');
        this.filterQSlider = document.getElementById('filterQ');
        this.reverbAmountSlider = document.getElementById('reverbAmount');
        this.movementSpeedSlider = document.getElementById('movementSpeedSlider');
        this.tempoSlider = document.getElementById('tempoSlider');
        this.loopToggleBtn = document.getElementById('loopToggleBtn');
        this.clearNotesBtn = document.getElementById('clearNotesBtn');
        this.randomScatterBtn = document.getElementById('randomScatterBtn');
        this.snapshotSelect = document.getElementById('snapshotSelect');
        this.saveSnapshotBtn = document.getElementById('saveSnapshotBtn');
        this.loadSnapshotBtn = document.getElementById('loadSnapshotBtn');
        this.shuffleTimelineBtn = document.getElementById('shuffleTimelineBtn');
        this.focusOriginBtn = document.getElementById('focusOriginBtn');
        this.exportJsonBtn = document.getElementById('exportJsonBtn');
        this.rangeOutputs = {
            noteVolume: document.getElementById('noteVolumeValue'),
            noteDuration: document.getElementById('noteDurationValue'),
            attackSlider: document.getElementById('attackValue'),
            releaseSlider: document.getElementById('releaseValue'),
            noteDelay: document.getElementById('noteDelayValue'),
            vibratoDepth: document.getElementById('vibratoDepthValue'),
            vibratoRate: document.getElementById('vibratoRateValue'),
            filterFrequency: document.getElementById('filterFrequencyValue'),
            filterQ: document.getElementById('filterQValue'),
            reverbAmount: document.getElementById('reverbAmountValue'),
            movementSpeedSlider: document.getElementById('movementSpeedValue'),
            tempoSlider: document.getElementById('tempoValue')
        };

        if (!this.root || !this.sceneContainer || !this.enterBtn || !this.exitBtn) {
            return;
        }

        this.sphereRadius = 6;
        this.moveSpeed = this.movementSpeedSlider ? Number(this.movementSpeedSlider.value) : 8;
        this.lookSensitivity = 0.0025;
        this.autoSpinSpeed = DEG2RAD * 12;
        this.notes = [];
        this.noteCounter = 0;
        this.moveState = { forward: false, back: false, left: false, right: false, up: false, down: false };
        this.isPointerDown = false;
        this.lastPointer = { x: 0, y: 0 };
        this.isActive = false;
        this.isAdjustingRotation = false;
        this.autoSpin = false;
        this.liveContext = null;
        this.activeTimeout = null;
        this.previewContext = null;
        this.snapEnabled = false;
        this.gridStep = 0.5;
        this.scalePreset = this.scaleSelect ? this.scaleSelect.value : 'chromatic';
        this.tempoSpacing = this.tempoSlider ? Number(this.tempoSlider.value) : 0.75;
        this.loopPlayback = false;
        this.shuffleTimeline = false;
        this.focusTarget = null;
        this.snapshotStore = { slot1: [], slot2: [], slot3: [] };
        this.scales = {
            chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            whole: [0, 2, 4, 6, 8, 10],
            minor: [0, 2, 3, 5, 7, 8, 10],
            major: [0, 2, 4, 6, 7, 9, 11],
            pentatonic: [0, 2, 4, 7, 9],
            octatonic: [0, 1, 3, 4, 6, 7, 9, 10]
        };

        this.animate = this.animate.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);

        this.setupThree();
        this.bindUI();
        this.setStatus('Drop coordinates to begin sculpting.');
    }

    setupThree() {
        const width = this.sceneContainer.clientWidth;
        const height = this.sceneContainer.clientHeight;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);
        this.sceneContainer.appendChild(this.renderer.domElement);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x05070f);
        this.scene.fog = new THREE.FogExp2(0x05070f, 0.018);

        this.camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 200);
        this.camera.position.set(0, 2, 14);
        this.yaw = Math.PI;
        this.pitch = 0;

        const ambient = new THREE.AmbientLight(0xf2d6c3, 0.35);
        this.scene.add(ambient);

        const hemi = new THREE.HemisphereLight(0xffb37f, 0x16274f, 0.5);
        this.scene.add(hemi);

        const dirLight = new THREE.DirectionalLight(0xffe8d1, 0.6);
        dirLight.position.set(6, 10, 6);
        dirLight.castShadow = false;
        this.scene.add(dirLight);

        this.stageGroup = new THREE.Group();
        this.scene.add(this.stageGroup);

        const sphereGeometry = new THREE.SphereGeometry(this.sphereRadius, 64, 64);
        const sphereMaterial = new THREE.MeshPhongMaterial({
            color: 0x1e2a52,
            wireframe: true,
            transparent: true,
            opacity: 0.2
        });
        this.sonicSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.stageGroup.add(this.sonicSphere);

        const floorGeometry = new THREE.CircleGeometry(this.sphereRadius, 64);
        const floorMaterial = new THREE.MeshBasicMaterial({
            color: 0x0d1324,
            transparent: true,
            opacity: 0.55
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        this.stageGroup.add(floor);

        const orbitRingGeometry = new THREE.RingGeometry(this.sphereRadius * 0.65, this.sphereRadius * 0.65 + 0.03, 128);
        const orbitMaterial = new THREE.MeshBasicMaterial({
            color: 0xffb05a,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide
        });
        const orbit = new THREE.Mesh(orbitRingGeometry, orbitMaterial);
        orbit.rotation.x = -Math.PI / 2;
        this.stageGroup.add(orbit);

        const verticalRing = orbit.clone();
        verticalRing.rotation.set(0, 0, Math.PI / 2);
        this.stageGroup.add(verticalRing);

        const particles = this.createStarfield(850, 90);
        this.scene.add(particles);

        this.noteGroup = new THREE.Group();
        this.stageGroup.add(this.noteGroup);

        this.clock = new THREE.Clock();
        this.updateCameraDirection();
    }

    createStarfield(count, spread) {
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * spread;
            positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
            positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: 0xffd5a6,
            size: 0.35,
            transparent: true,
            opacity: 0.6
        });
        return new THREE.Points(geometry, material);
    }

    bindUI() {
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);

        this.sceneContainer.addEventListener('mousedown', (event) => {
            if (!this.isActive) return;
            this.isPointerDown = true;
            this.lastPointer.x = event.clientX;
            this.lastPointer.y = event.clientY;
        });

        window.addEventListener('mouseup', () => {
            this.isPointerDown = false;
        });

        window.addEventListener('mousemove', (event) => {
            if (!this.isPointerDown || !this.isActive) return;
            const dx = event.clientX - this.lastPointer.x;
            const dy = event.clientY - this.lastPointer.y;
            this.lastPointer.x = event.clientX;
            this.lastPointer.y = event.clientY;

            this.yaw -= dx * this.lookSensitivity;
            this.pitch -= dy * this.lookSensitivity;
            const maxPitch = Math.PI / 2 - 0.2;
            this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
            this.updateCameraDirection();
        });

        this.enterBtn.addEventListener('click', () => this.enter());
        this.exitBtn.addEventListener('click', () => this.exit());

        this.addNoteBtn?.addEventListener('click', () => this.handleAddNote());
        this.playBtn?.addEventListener('click', () => this.playComposition());
        this.stopBtn?.addEventListener('click', () => {
            this.stopPlayback();
            this.setStatus('Playback stopped. Ready for the next sculpt.', true);
        });
        this.saveBtn?.addEventListener('click', () => this.saveComposition());

        if (this.autoSpinBtn) {
            this.autoSpinBtn.addEventListener('click', () => {
                this.autoSpin = !this.autoSpin;
                this.autoSpinBtn.classList.toggle('active', this.autoSpin);
                this.setStatus(this.autoSpin ? 'Sphere spinning — listen for orbital sweeps.' : 'Sphere rotation paused.');
            });
        }

        if (this.rotationSlider) {
            const beginAdjust = () => {
                this.isAdjustingRotation = true;
                this.autoSpin = false;
                this.autoSpinBtn?.classList.remove('active');
            };
            const finishAdjust = () => {
                this.isAdjustingRotation = false;
            };
            this.rotationSlider.addEventListener('pointerdown', beginAdjust);
            this.rotationSlider.addEventListener('pointerup', finishAdjust);
            this.rotationSlider.addEventListener('touchstart', beginAdjust, { passive: true });
            this.rotationSlider.addEventListener('touchend', finishAdjust);
            this.rotationSlider.addEventListener('input', (event) => {
                const degrees = Number(event.target.value);
                this.stageGroup.rotation.y = degrees * DEG2RAD;
                this.setStatus(`Sphere rotated ${degrees.toFixed(0)}°.`);
            });
        }

        this.randomizeBtn?.addEventListener('click', () => this.randomizeCoordinates());
        this.snapToggleBtn?.addEventListener('click', () => {
            this.snapEnabled = !this.snapEnabled;
            this.snapToggleBtn.classList.toggle('active', this.snapEnabled);
            this.setStatus(this.snapEnabled ? 'Grid snapping enabled at 0.5 units.' : 'Grid snapping disabled.');
        });

        Object.entries(this.mirrorButtons).forEach(([axis, button]) => {
            button?.addEventListener('click', () => {
                if (!this.coordInputs[axis]) return;
                const current = parseFloat(this.coordInputs[axis].value || '0');
                if (Number.isNaN(current)) return;
                const mirrored = -current;
                this.coordInputs[axis].value = mirrored.toFixed(2);
                this.setStatus(`Mirrored ${axis.toUpperCase()} to ${mirrored.toFixed(2)}.`, true);
            });
        });

        this.scaleSelect?.addEventListener('change', () => {
            this.scalePreset = this.scaleSelect.value;
            this.setStatus(`Pitch palette set to ${this.scaleSelect.options[this.scaleSelect.selectedIndex].text}.`, true);
        });

        this.bindRangeOutput(this.noteVolumeSlider, this.rangeOutputs.noteVolume, (val) => `${Math.round(val * 100)}%`);
        this.bindRangeOutput(this.noteDurationSlider, this.rangeOutputs.noteDuration, (val) => `${val.toFixed(2)}s`);
        this.bindRangeOutput(this.attackSlider, this.rangeOutputs.attackSlider, (val) => `${val.toFixed(2)}s`);
        this.bindRangeOutput(this.releaseSlider, this.rangeOutputs.releaseSlider, (val) => `${val.toFixed(2)}s`);
        this.bindRangeOutput(this.noteDelaySlider, this.rangeOutputs.noteDelay, (val) => `${val.toFixed(2)}s`);
        this.bindRangeOutput(this.vibratoDepthSlider, this.rangeOutputs.vibratoDepth, (val) => `${Math.round(val)}¢`);
        this.bindRangeOutput(this.vibratoRateSlider, this.rangeOutputs.vibratoRate, (val) => `${val.toFixed(1)}Hz`);
        this.bindRangeOutput(this.filterFrequencySlider, this.rangeOutputs.filterFrequency, (val) => `${(val / 1000).toFixed(2)}kHz`);
        this.bindRangeOutput(this.filterQSlider, this.rangeOutputs.filterQ, (val) => `Q ${val.toFixed(1)}`);
        this.bindRangeOutput(this.reverbAmountSlider, this.rangeOutputs.reverbAmount, (val) => `${Math.round(val * 100)}%`);
        this.bindRangeOutput(this.movementSpeedSlider, this.rangeOutputs.movementSpeedSlider, (val) => {
            this.moveSpeed = val;
            return `${val.toFixed(0)} m/s`;
        });
        this.bindRangeOutput(this.tempoSlider, this.rangeOutputs.tempoSlider, (val) => {
            this.tempoSpacing = val;
            return `${val.toFixed(2)}s`;
        });

        this.loopToggleBtn?.addEventListener('click', () => {
            this.loopPlayback = !this.loopPlayback;
            this.loopToggleBtn.classList.toggle('active', this.loopPlayback);
            this.setStatus(this.loopPlayback ? 'Loop enabled — the mix will repeat.' : 'Loop disabled.');
        });

        this.clearNotesBtn?.addEventListener('click', () => this.clearNotes());
        this.randomScatterBtn?.addEventListener('click', () => this.scatterNotes(6));
        this.saveSnapshotBtn?.addEventListener('click', () => this.saveSnapshot());
        this.loadSnapshotBtn?.addEventListener('click', () => this.loadSnapshot());

        this.shuffleTimelineBtn?.addEventListener('click', () => {
            this.shuffleTimeline = !this.shuffleTimeline;
            this.shuffleTimelineBtn.classList.toggle('active', this.shuffleTimeline);
            this.setStatus(this.shuffleTimeline ? 'Playback timeline will shuffle each pass.' : 'Playback order restored.');
        });

        this.focusOriginBtn?.addEventListener('click', () => this.focusOrigin());
        this.exportJsonBtn?.addEventListener('click', () => this.exportLayout());

        this.noteListEl?.addEventListener('click', (event) => {
            const target = event.target instanceof HTMLElement ? event.target : null;
            const button = target?.closest('button[data-action]');
            if (!button) return;
            const id = Number(button.dataset.id);
            if (Number.isNaN(id)) return;
            switch (button.dataset.action) {
                case 'remove':
                    this.removeNoteById(id);
                    break;
                case 'preview':
                    this.previewNote(id);
                    break;
                case 'focus':
                    this.focusNote(id);
                    break;
                case 'duplicate':
                    this.duplicateNote(id);
                    break;
                case 'mute':
                    this.toggleMute(id, button);
                    break;
                case 'solo':
                    this.toggleSolo(id, button);
                    break;
                default:
                    break;
            }
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isActive) {
                this.exit();
            }
        });
    }

    bindRangeOutput(slider, output, formatter) {
        if (!slider || !output || typeof formatter !== 'function') return;
        const update = () => {
            const value = Number(slider.value);
            output.textContent = formatter(value);
        };
        slider.addEventListener('input', update);
        update();
    }

    enter() {
        if (this.isActive) return;
        document.body.classList.add('composer-active');
        this.root?.setAttribute('aria-hidden', 'false');
        this.exitBtn?.setAttribute('aria-hidden', 'false');
        this.isActive = true;
        this.clock.start();
        this.renderer.setAnimationLoop(this.animate);
        this.handleResize();
        this.setStatus('Spatial atelier ready — sculpt your constellation.');
    }

    exit() {
        if (!this.isActive) return;
        document.body.classList.remove('composer-active');
        this.root?.setAttribute('aria-hidden', 'true');
        this.exitBtn?.setAttribute('aria-hidden', 'true');
        this.isActive = false;
        this.renderer.setAnimationLoop(null);
        this.stopPlayback();
        this.stopPreview();
        this.autoSpin = false;
        this.autoSpinBtn?.classList.remove('active');
        if (this.rotationSlider) {
            this.rotationSlider.value = '0';
        }
        this.stageGroup.rotation.y = 0;
        this.camera.position.set(0, 2, 14);
        this.yaw = Math.PI;
        this.pitch = 0;
        this.updateCameraDirection();
        this.focusTarget = null;
        this.setStatus('Drop coordinates to begin sculpting.');
    }

    handleAddNote() {
        const position = this.preparePositionFromInputs();
        if (!position) {
            this.setStatus('Enter numeric values for X, Y, and Z.');
            return;
        }

        const label = this.coordLabelInput?.value.trim();
        const noteData = this.generateNoteData(position, { label });
        this.spawnNote(noteData);
        if (this.coordLabelInput) {
            this.coordLabelInput.value = '';
        }
    }

    randomizeCoordinates() {
        const vector = new THREE.Vector3(
            (Math.random() * 2 - 1),
            (Math.random() * 2 - 1),
            (Math.random() * 2 - 1)
        ).normalize().multiplyScalar(Math.random() * (this.sphereRadius - 0.4));
        if (this.snapEnabled) {
            vector.set(
                this.applySnap(vector.x),
                this.applySnap(vector.y),
                this.applySnap(vector.z)
            );
        }
        if (this.coordInputs.x) this.coordInputs.x.value = vector.x.toFixed(2);
        if (this.coordInputs.y) this.coordInputs.y.value = vector.y.toFixed(2);
        if (this.coordInputs.z) this.coordInputs.z.value = vector.z.toFixed(2);
        this.setStatus('Coordinates randomized within the sphere.', true);
    }

    preparePositionFromInputs() {
        const x = parseFloat(this.coordInputs.x?.value || '0');
        const y = parseFloat(this.coordInputs.y?.value || '0');
        const z = parseFloat(this.coordInputs.z?.value || '0');
        if ([x, y, z].some((v) => Number.isNaN(v))) {
            return null;
        }
        const position = new THREE.Vector3(x, y, z);
        if (this.snapEnabled) {
            position.set(
                this.applySnap(position.x),
                this.applySnap(position.y),
                this.applySnap(position.z)
            );
        }
        if (position.length() > this.sphereRadius) {
            position.setLength(this.sphereRadius - 0.2);
            this.setStatus('Point nudged inside the sphere for resonance.', true);
            if (this.coordInputs.x) this.coordInputs.x.value = position.x.toFixed(2);
            if (this.coordInputs.y) this.coordInputs.y.value = position.y.toFixed(2);
            if (this.coordInputs.z) this.coordInputs.z.value = position.z.toFixed(2);
        }
        return position;
    }

    applySnap(value) {
        const snapped = Math.round(value / this.gridStep) * this.gridStep;
        return Number(snapped.toFixed(2));
    }

    generateNoteData(position, overrides = {}) {
        const labelBase = overrides.label && overrides.label.length ? overrides.label : `Resonance ${this.noteCounter + 1}`;
        const label = labelBase.trim();
        const waveform = overrides.waveform || this.waveformSelect?.value || 'sine';
        const volume = overrides.volume ?? (this.noteVolumeSlider ? Number(this.noteVolumeSlider.value) : 0.6);
        const duration = overrides.duration ?? (this.noteDurationSlider ? Number(this.noteDurationSlider.value) : 1.1);
        const attack = overrides.attack ?? (this.attackSlider ? Number(this.attackSlider.value) : 0.08);
        const release = overrides.release ?? (this.releaseSlider ? Number(this.releaseSlider.value) : 1.2);
        const delay = overrides.delay ?? (this.noteDelaySlider ? Number(this.noteDelaySlider.value) : 0.2);
        const vibratoDepth = overrides.vibratoDepth ?? (this.vibratoDepthSlider ? Number(this.vibratoDepthSlider.value) : 12);
        const vibratoRate = overrides.vibratoRate ?? (this.vibratoRateSlider ? Number(this.vibratoRateSlider.value) : 4.5);
        const filterType = overrides.filterType || this.filterTypeSelect?.value || 'lowpass';
        const filterFrequency = overrides.filterFrequency ?? (this.filterFrequencySlider ? Number(this.filterFrequencySlider.value) : 2200);
        const filterQ = overrides.filterQ ?? (this.filterQSlider ? Number(this.filterQSlider.value) : 4);
        const reverbAmount = overrides.reverbAmount ?? (this.reverbAmountSlider ? Number(this.reverbAmountSlider.value) : 0.35);

        return {
            id: ++this.noteCounter,
            label,
            position: position.clone(),
            waveform,
            volume,
            duration,
            attack,
            release,
            delay,
            vibratoDepth,
            vibratoRate,
            filterType,
            filterFrequency,
            filterQ,
            reverbAmount,
            muted: overrides.muted ?? false,
            solo: overrides.solo ?? false,
            mesh: null
        };
    }

    spawnNote(noteData) {
        const hue = THREE.MathUtils.mapLinear(noteData.position.y, -this.sphereRadius, this.sphereRadius, 0.58, 0.03);
        const color = new THREE.Color().setHSL(THREE.MathUtils.euclideanModulo(hue, 1), 0.65, 0.55);
        const emissive = color.clone().multiplyScalar(0.35);

        const noteMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 24, 24),
            new THREE.MeshStandardMaterial({
                color,
                emissive,
                metalness: 0.45,
                roughness: 0.35
            })
        );
        noteMesh.position.copy(noteData.position);
        noteMesh.castShadow = false;
        this.noteGroup.add(noteMesh);
        noteData.mesh = noteMesh;
        this.notes.push(noteData);
        this.updateNoteList();
        this.setStatus(`Resonance "${noteData.label}" seeded inside the sphere.`, true);
    }

    updateNoteList() {
        if (!this.noteListEl) return;
        this.noteListEl.innerHTML = '';

        if (this.notes.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No resonances yet — drop a point to begin.';
            this.noteListEl.appendChild(li);
            return;
        }

        this.notes.forEach((note) => {
            const li = document.createElement('li');
            const meta = document.createElement('div');
            meta.className = 'note-meta';
            const title = document.createElement('strong');
            title.textContent = note.label;
            meta.appendChild(title);
            const coords = document.createElement('span');
            coords.textContent = `X ${note.position.x.toFixed(2)} · Y ${note.position.y.toFixed(2)} · Z ${note.position.z.toFixed(2)}`;
            meta.appendChild(coords);
            const detail = document.createElement('span');
            detail.textContent = `${note.waveform === 'sine' ? 'Sine' : note.waveform.charAt(0).toUpperCase() + note.waveform.slice(1)} · ${note.duration.toFixed(2)}s · ${this.scalePreset}`;
            meta.appendChild(detail);
            li.appendChild(meta);

            const actions = document.createElement('div');
            actions.className = 'note-actions';

            const actionButtons = [
                { action: 'preview', label: 'Preview' },
                { action: 'focus', label: 'Focus' },
                { action: 'duplicate', label: 'Duplicate' },
                { action: 'mute', label: note.muted ? 'Muted' : 'Mute', active: note.muted },
                { action: 'solo', label: note.solo ? 'Soloed' : 'Solo', active: note.solo },
                { action: 'remove', label: 'Remove' }
            ];

            actionButtons.forEach(({ action, label, active }) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.action = action;
                button.dataset.id = String(note.id);
                button.textContent = label;
                if (active) {
                    button.classList.add('active');
                }
                actions.appendChild(button);
            });

            li.appendChild(actions);
            this.noteListEl.appendChild(li);
        });
    }

    findNoteIndex(id) {
        return this.notes.findIndex((note) => note.id === id);
    }

    removeNoteById(id) {
        const index = this.findNoteIndex(id);
        if (index === -1) return;
        const note = this.notes[index];
        if (note.mesh) {
            this.noteGroup.remove(note.mesh);
            note.mesh.geometry.dispose();
            note.mesh.material.dispose();
        }
        this.notes.splice(index, 1);
        this.updateNoteList();
        this.setStatus('Resonance removed.');
    }

    clearNotes() {
        this.notes.forEach((note) => {
            if (note.mesh) {
                this.noteGroup.remove(note.mesh);
                note.mesh.geometry.dispose();
                note.mesh.material.dispose();
            }
        });
        this.notes = [];
        this.updateNoteList();
        this.setStatus('All resonances cleared. Fresh canvas ready.', true);
    }

    duplicateNote(id) {
        const index = this.findNoteIndex(id);
        if (index === -1) return;
        const source = this.notes[index];
        const offset = source.position.clone().normalize().multiplyScalar(0.6);
        const newPosition = source.position.clone().add(offset);
        if (newPosition.length() > this.sphereRadius) {
            newPosition.setLength(this.sphereRadius - 0.2);
        }
        const duplicate = this.generateNoteData(newPosition, {
            label: `${source.label} (mirror)`,
            waveform: source.waveform,
            volume: source.volume,
            duration: source.duration,
            attack: source.attack,
            release: source.release,
            delay: source.delay,
            vibratoDepth: source.vibratoDepth,
            vibratoRate: source.vibratoRate,
            filterType: source.filterType,
            filterFrequency: source.filterFrequency,
            filterQ: source.filterQ,
            reverbAmount: source.reverbAmount
        });
        this.spawnNote(duplicate);
    }

    toggleMute(id, button) {
        const index = this.findNoteIndex(id);
        if (index === -1) return;
        const note = this.notes[index];
        note.muted = !note.muted;
        if (button) {
            button.classList.toggle('active', note.muted);
            button.textContent = note.muted ? 'Muted' : 'Mute';
        }
        this.setStatus(note.muted ? `${note.label} muted.` : `${note.label} unmuted.`, true);
    }

    toggleSolo(id, button) {
        const index = this.findNoteIndex(id);
        if (index === -1) return;
        const note = this.notes[index];
        note.solo = !note.solo;
        if (button) {
            button.classList.toggle('active', note.solo);
            button.textContent = note.solo ? 'Soloed' : 'Solo';
        }
        this.setStatus(note.solo ? `${note.label} soloed — other voices will dim.` : `${note.label} returned to ensemble.`, true);
    }

    previewNote(id) {
        const index = this.findNoteIndex(id);
        if (index === -1) return;
        const note = this.notes[index];
        this.stopPreview();
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            this.setStatus('AudioContext not supported in this browser.');
            return;
        }
        const context = new AudioCtx();
        this.previewContext = context;
        const masterGain = context.createGain();
        masterGain.gain.setValueAtTime(0.8, context.currentTime);
        masterGain.connect(context.destination);
        const stopTime = this.scheduleNote(context, masterGain, context.currentTime + 0.05, note);
        this.setStatus(`Previewing ${note.label}.`, true);
        window.setTimeout(() => this.stopPreview(), (stopTime - context.currentTime + 0.1) * 1000);
    }

    stopPreview() {
        if (this.previewContext) {
            try {
                this.previewContext.close();
            } catch (error) {
                console.warn('ComposerSpace: unable to close preview context', error);
            }
            this.previewContext = null;
        }
    }

    focusNote(id) {
        const index = this.findNoteIndex(id);
        if (index === -1) return;
        const note = this.notes[index];
        const direction = note.position.clone().normalize();
        const target = note.position.clone().add(direction.multiplyScalar(2.4));
        target.y += 1.2;
        this.focusTarget = target;
        this.yaw = Math.atan2(note.position.x - target.x, note.position.z - target.z);
        const pitchDirection = new THREE.Vector3().subVectors(note.position, target).normalize();
        this.pitch = Math.asin(pitchDirection.y);
        this.setStatus(`Camera gliding to ${note.label}.`, true);
    }

    focusOrigin() {
        const target = new THREE.Vector3(0, 2, this.sphereRadius * 2.2);
        this.focusTarget = target;
        this.yaw = Math.PI;
        this.pitch = 0;
        this.setStatus('Camera recentred on the atelier.', true);
    }

    scatterNotes(count = 6) {
        for (let i = 0; i < count; i++) {
            const vector = new THREE.Vector3(
                (Math.random() * 2 - 1),
                (Math.random() * 2 - 1),
                (Math.random() * 2 - 1)
            ).normalize().multiplyScalar(Math.random() * (this.sphereRadius - 0.6));
            if (this.snapEnabled) {
                vector.set(
                    this.applySnap(vector.x),
                    this.applySnap(vector.y),
                    this.applySnap(vector.z)
                );
            }
            const noteData = this.generateNoteData(vector, { label: `Scatter ${i + 1}` });
            this.spawnNote(noteData);
        }
        this.setStatus('Six resonances scattered across the sphere.', true);
    }

    saveSnapshot() {
        if (!this.snapshotSelect) return;
        const slot = this.snapshotSelect.value;
        this.snapshotStore[slot] = this.notes.map((note) => ({
            label: note.label,
            position: note.position.toArray(),
            waveform: note.waveform,
            volume: note.volume,
            duration: note.duration,
            attack: note.attack,
            release: note.release,
            delay: note.delay,
            vibratoDepth: note.vibratoDepth,
            vibratoRate: note.vibratoRate,
            filterType: note.filterType,
            filterFrequency: note.filterFrequency,
            filterQ: note.filterQ,
            reverbAmount: note.reverbAmount,
            muted: note.muted,
            solo: note.solo
        }));
        this.setStatus(`Snapshot saved to ${slot.toUpperCase()}.`, true);
    }

    loadSnapshot() {
        if (!this.snapshotSelect) return;
        const slot = this.snapshotSelect.value;
        const snapshot = this.snapshotStore[slot];
        if (!snapshot || snapshot.length === 0) {
            this.setStatus('Snapshot slot is empty.');
            return;
        }
        this.clearNotes();
        snapshot.forEach((data) => {
            const position = new THREE.Vector3().fromArray(data.position);
            const noteData = this.generateNoteData(position, data);
            this.spawnNote(noteData);
        });
        this.setStatus(`Snapshot ${slot.toUpperCase()} loaded.`, true);
    }

    exportLayout() {
        const payload = this.notes.map((note) => ({
            label: note.label,
            position: note.position.toArray(),
            waveform: note.waveform,
            volume: note.volume,
            duration: note.duration,
            attack: note.attack,
            release: note.release,
            delay: note.delay,
            vibratoDepth: note.vibratoDepth,
            vibratoRate: note.vibratoRate,
            filterType: note.filterType,
            filterFrequency: note.filterFrequency,
            filterQ: note.filterQ,
            reverbAmount: note.reverbAmount,
            muted: note.muted,
            solo: note.solo
        }));
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `spatial-atlier-layout-${Date.now()}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        this.setStatus('Layout exported as JSON.', true);
    }

    getPlayableNotes() {
        const soloed = this.notes.filter((note) => note.solo && !note.muted);
        if (soloed.length > 0) {
            return soloed;
        }
        return this.notes.filter((note) => !note.muted);
    }

    getPlaybackOrder(notes) {
        if (!this.shuffleTimeline) {
            return [...notes];
        }
        const shuffled = [...notes];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    playComposition() {
        const playable = this.getPlayableNotes();
        if (playable.length === 0) {
            this.setStatus('Add or unmute resonances before playing.');
            return;
        }

        this.stopPlayback();
        this.stopPreview();

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            this.setStatus('AudioContext not supported in this browser.');
            return;
        }

        const context = new AudioCtx();
        this.liveContext = context;
        const now = context.currentTime + 0.15;
        const masterGain = context.createGain();
        masterGain.gain.setValueAtTime(0.9, now);
        masterGain.connect(context.destination);

        const order = this.getPlaybackOrder(playable);
        let maxTime = now;
        order.forEach((note, index) => {
            const startOffset = index * this.tempoSpacing + note.delay;
            const stopTime = this.scheduleNote(context, masterGain, now + startOffset, note);
            maxTime = Math.max(maxTime, stopTime);
        });

        this.setStatus('Live mix playing — listen in motion.', true);
        this.activeTimeout = window.setTimeout(() => {
            this.setStatus('Playback complete. Ready for the next constellation.');
            this.stopPlayback();
            if (this.loopPlayback && this.notes.length) {
                this.playComposition();
            }
        }, (maxTime - context.currentTime) * 1000);
    }

    stopPlayback() {
        if (this.liveContext) {
            try {
                this.liveContext.close();
            } catch (error) {
                console.warn('ComposerSpace: unable to close context', error);
            }
            this.liveContext = null;
        }
        if (this.activeTimeout) {
            window.clearTimeout(this.activeTimeout);
            this.activeTimeout = null;
        }
    }

    async saveComposition() {
        const playable = this.getPlayableNotes();
        if (playable.length === 0) {
            this.setStatus('Add resonances before exporting a mix.');
            return;
        }

        const sampleRate = 44100;
        const durationEstimate = playable.length * this.tempoSpacing + 4;
        const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * durationEstimate), sampleRate);
        const masterGain = offline.createGain();
        masterGain.gain.setValueAtTime(0.9, 0);
        masterGain.connect(offline.destination);

        const order = this.getPlaybackOrder(playable);
        let maxTime = 0;
        order.forEach((note, index) => {
            const startOffset = index * this.tempoSpacing + note.delay + 0.2;
            const stopTime = this.scheduleNote(offline, masterGain, startOffset, note);
            maxTime = Math.max(maxTime, stopTime);
        });

        this.setStatus('Rendering mix for download…');
        try {
            const buffer = await offline.startRendering();
            const blob = this.audioBufferToWav(buffer);
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `boulez-atlier-${Date.now()}.wav`;
            anchor.click();
            URL.revokeObjectURL(url);
            this.setStatus('Mix downloaded — continue sculpting!', true);
        } catch (error) {
            console.error('ComposerSpace: unable to export mix', error);
            this.setStatus('Something interrupted the export. Please try again.');
        }
    }

    scheduleNote(context, destination, startTime, note) {
        const isNoise = note.waveform === 'noise';
        let source;
        if (isNoise) {
            const buffer = context.createBuffer(1, context.sampleRate * Math.max(1, note.duration + note.release + 1), context.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = context.createBufferSource();
            noise.buffer = buffer;
            source = noise;
        } else {
            source = context.createOscillator();
            source.type = note.waveform;
            source.frequency.setValueAtTime(this.mapToFrequency(note), startTime);
            if (note.vibratoDepth > 0) {
                const vibrato = context.createOscillator();
                vibrato.frequency.setValueAtTime(note.vibratoRate, startTime);
                const vibratoGain = context.createGain();
                vibratoGain.gain.setValueAtTime(note.vibratoDepth, startTime);
                vibrato.connect(vibratoGain);
                vibratoGain.connect(source.frequency);
                vibrato.start(startTime);
                vibrato.stop(startTime + note.duration + note.release + 1);
            }
        }

        const gain = context.createGain();
        const filter = context.createBiquadFilter();
        filter.type = note.filterType;
        filter.frequency.setValueAtTime(note.filterFrequency, startTime);
        filter.Q.setValueAtTime(note.filterQ, startTime);
        const pan = context.createStereoPanner();
        pan.pan.setValueAtTime(this.mapToPan(note.position), startTime);

        const dryGain = context.createGain();
        const wetGain = context.createGain();
        dryGain.gain.setValueAtTime(this.mapDistanceGain(note.position) * note.volume, startTime);
        wetGain.gain.setValueAtTime(note.reverbAmount, startTime);

        const delay = context.createDelay(1.5);
        delay.delayTime.setValueAtTime(0.28, startTime);
        const feedback = context.createGain();
        feedback.gain.setValueAtTime(0.32, startTime);
        delay.connect(feedback);
        feedback.connect(delay);

        const reverbOut = context.createGain();
        reverbOut.gain.setValueAtTime(note.reverbAmount, startTime);

        source.connect(gain);
        gain.connect(filter);
        filter.connect(dryGain);
        filter.connect(wetGain);
        dryGain.connect(pan);
        pan.connect(destination);

        wetGain.connect(delay);
        wetGain.connect(reverbOut);
        delay.connect(reverbOut);
        reverbOut.connect(destination);

        const attack = Math.max(0.01, note.attack);
        const sustain = Math.max(0.05, note.duration);
        const release = Math.max(0.05, note.release);
        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, dryGain.gain.value), startTime + attack);
        gain.gain.setValueAtTime(Math.max(0.001, dryGain.gain.value), startTime + attack + sustain);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + attack + sustain + release);

        if (isNoise) {
            source.start(startTime);
            source.stop(startTime + attack + sustain + release + 0.1);
        } else {
            source.start(startTime);
            source.stop(startTime + attack + sustain + release + 0.1);
        }

        return startTime + attack + sustain + release + 0.1;
    }

    mapDistanceGain(position) {
        const normalized = THREE.MathUtils.clamp(position.length() / this.sphereRadius, 0, 1);
        return 0.18 + normalized * 0.55;
    }

    mapToPan(position) {
        return THREE.MathUtils.clamp(position.x / this.sphereRadius, -1, 1);
    }

    heightToMidi(height) {
        const minMidi = 48; // C3
        const maxMidi = 88; // E6
        const normalized = THREE.MathUtils.clamp((height + this.sphereRadius) / (this.sphereRadius * 2), 0, 1);
        return minMidi + (maxMidi - minMidi) * normalized;
    }

    quantizeMidi(midi) {
        const scale = this.scales[this.scalePreset] || this.scales.chromatic;
        const baseOctave = Math.floor(midi / 12);
        const candidates = [];
        for (let octave = baseOctave - 1; octave <= baseOctave + 1; octave++) {
            scale.forEach((step) => {
                candidates.push(octave * 12 + step);
            });
        }
        let closest = candidates[0];
        let minDiff = Math.abs(candidates[0] - midi);
        for (let i = 1; i < candidates.length; i++) {
            const diff = Math.abs(candidates[i] - midi);
            if (diff < minDiff) {
                minDiff = diff;
                closest = candidates[i];
            }
        }
        return closest;
    }

    mapToFrequency(note) {
        const midi = this.heightToMidi(note.position.y);
        const quantized = this.quantizeMidi(midi);
        return 440 * Math.pow(2, (quantized - 69) / 12);
    }

    audioBufferToWav(buffer) {
        const numOfChan = buffer.numberOfChannels;
        const length = buffer.length * numOfChan * 2 + 44;
        const bufferArray = new ArrayBuffer(length);
        const view = new DataView(bufferArray);
        let offset = 0;

        const writeString = (str) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        };

        writeString('RIFF'); offset += 4;
        view.setUint32(offset, 36 + buffer.length * numOfChan * 2, true); offset += 4;
        writeString('WAVE'); offset += 4;
        writeString('fmt '); offset += 4;
        view.setUint32(offset, 16, true); offset += 4;
        view.setUint16(offset, 1, true); offset += 2;
        view.setUint16(offset, numOfChan, true); offset += 2;
        view.setUint32(offset, buffer.sampleRate, true); offset += 4;
        view.setUint32(offset, buffer.sampleRate * numOfChan * 2, true); offset += 4;
        view.setUint16(offset, numOfChan * 2, true); offset += 2;
        view.setUint16(offset, 16, true); offset += 2;
        writeString('data'); offset += 4;
        view.setUint32(offset, buffer.length * numOfChan * 2, true); offset += 4;

        const channels = [];
        for (let i = 0; i < numOfChan; i++) {
            channels.push(buffer.getChannelData(i));
        }

        let sampleIndex = 0;
        while (sampleIndex < buffer.length) {
            for (let channel = 0; channel < numOfChan; channel++) {
                const sample = Math.max(-1, Math.min(1, channels[channel][sampleIndex]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
                offset += 2;
            }
            sampleIndex++;
        }

        return new Blob([bufferArray], { type: 'audio/wav' });
    }

    updateCameraDirection() {
        const direction = new THREE.Vector3(
            Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            Math.cos(this.yaw) * Math.cos(this.pitch)
        );
        const target = new THREE.Vector3().copy(this.camera.position).add(direction);
        this.camera.lookAt(target);
    }

    updateMovement(delta) {
        const direction = new THREE.Vector3();
        if (this.moveState.forward) direction.z -= 1;
        if (this.moveState.back) direction.z += 1;
        if (this.moveState.left) direction.x -= 1;
        if (this.moveState.right) direction.x += 1;

        if (direction.lengthSq() > 0) {
            direction.normalize();
            direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
            this.camera.position.addScaledVector(direction, this.moveSpeed * delta);
        }

        if (this.moveState.up) this.camera.position.y += this.moveSpeed * delta;
        if (this.moveState.down) this.camera.position.y -= this.moveSpeed * delta;

        if (this.focusTarget) {
            const toTarget = new THREE.Vector3().subVectors(this.focusTarget, this.camera.position);
            const distance = toTarget.length();
            if (distance > 0.05) {
                toTarget.normalize();
                const step = Math.min(distance, delta * this.moveSpeed * 1.2);
                this.camera.position.addScaledVector(toTarget, step);
            } else {
                this.focusTarget = null;
            }
        }

        const distance = this.camera.position.length();
        const maxDistance = this.sphereRadius * 2.4;
        if (distance > maxDistance) {
            this.camera.position.setLength(maxDistance);
        }

        this.updateCameraDirection();
    }

    animate() {
        if (!this.isActive) return;
        const delta = this.clock.getDelta();
        this.updateMovement(delta);

        if (this.autoSpin) {
            this.stageGroup.rotation.y += this.autoSpinSpeed * delta;
            if (!this.isAdjustingRotation && this.rotationSlider) {
                const normalizedDeg = THREE.MathUtils.radToDeg(this.stageGroup.rotation.y);
                const wrapped = THREE.MathUtils.euclideanModulo(normalizedDeg + 180, 360) - 180;
                this.rotationSlider.value = wrapped.toFixed(0);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }

    handleResize() {
        if (!this.renderer || !this.camera) return;
        const width = this.sceneContainer.clientWidth;
        const height = this.sceneContainer.clientHeight;
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    onKeyDown(event) {
        if (!this.isActive) return;
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveState.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveState.back = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveState.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveState.right = true;
                break;
            case 'Space':
                this.moveState.up = true;
                event.preventDefault();
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.moveState.down = true;
                break;
            case 'KeyQ':
                this.moveState.up = true;
                break;
            case 'KeyE':
                this.moveState.down = true;
                break;
            case 'Escape':
                this.exit();
                break;
            default:
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveState.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveState.back = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveState.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveState.right = false;
                break;
            case 'Space':
                this.moveState.up = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.moveState.down = false;
                break;
            case 'KeyQ':
                this.moveState.up = false;
                break;
            case 'KeyE':
                this.moveState.down = false;
                break;
            default:
                break;
        }
    }

    setStatus(message, highlight = false) {
        if (!this.statusEl) return;
        this.statusEl.textContent = message;
        this.statusEl.classList.toggle('status-display--active', highlight);
    }
}

new SpatialComposer();
