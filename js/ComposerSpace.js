const DEG2RAD = Math.PI / 180;

class SpatialComposer {
    constructor() {
        this.root = document.getElementById('composer-space');
        this.sceneContainer = document.getElementById('composer-scene');
        this.enterBtn = document.getElementById('enterComposerSpace');
        this.exitBtn = document.getElementById('exitComposerSpace');
        this.addNoteBtn = document.getElementById('addNoteBtn');
        this.playBtn = document.getElementById('playCompositionBtn');
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

        if (!this.root || !this.sceneContainer || !this.enterBtn || !this.exitBtn) {
            return;
        }

        this.sphereRadius = 6;
        this.moveSpeed = 8;
        this.lookSensitivity = 0.0025;
        this.autoSpinSpeed = DEG2RAD * 12;
        this.notes = [];
        this.moveState = { forward: false, back: false, left: false, right: false, up: false, down: false };
        this.isPointerDown = false;
        this.lastPointer = { x: 0, y: 0 };
        this.isActive = false;
        this.isAdjustingRotation = false;
        this.autoSpin = false;
        this.liveContext = null;
        this.activeTimeout = null;

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

        if (this.addNoteBtn) {
            this.addNoteBtn.addEventListener('click', () => this.handleAddNote());
        }

        if (this.playBtn) {
            this.playBtn.addEventListener('click', () => this.playComposition());
        }

        if (this.saveBtn) {
            this.saveBtn.addEventListener('click', () => this.saveComposition());
        }

        if (this.autoSpinBtn) {
            this.autoSpinBtn.addEventListener('click', () => {
                this.autoSpin = !this.autoSpin;
                this.autoSpinBtn.classList.toggle('active', this.autoSpin);
                this.setStatus(this.autoSpin ? 'Sphere spinning — listen for orbital sweeps.' : 'Sphere rotation paused.');
            });
        }

        if (this.rotationSlider) {
            this.rotationSlider.addEventListener('pointerdown', () => {
                this.isAdjustingRotation = true;
                this.autoSpin = false;
                this.autoSpinBtn?.classList.remove('active');
            });
            this.rotationSlider.addEventListener('pointerup', () => {
                this.isAdjustingRotation = false;
            });
            this.rotationSlider.addEventListener('touchstart', () => {
                this.isAdjustingRotation = true;
                this.autoSpin = false;
                this.autoSpinBtn?.classList.remove('active');
            }, { passive: true });
            this.rotationSlider.addEventListener('touchend', () => {
                this.isAdjustingRotation = false;
            });
            this.rotationSlider.addEventListener('input', (event) => {
                const degrees = Number(event.target.value);
                this.stageGroup.rotation.y = degrees * DEG2RAD;
                this.setStatus(`Sphere rotated ${degrees.toFixed(0)}°.`);
            });
        }

        if (this.noteListEl) {
            this.noteListEl.addEventListener('click', (event) => {
                const target = event.target;
                if (target instanceof HTMLElement && target.dataset.index) {
                    const index = Number(target.dataset.index);
                    this.removeNote(index);
                }
            });
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isActive) {
                this.exit();
            }
        });
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
        this.setStatus('Drop coordinates to begin sculpting.');
    }

    handleAddNote() {
        const x = parseFloat(this.coordInputs.x?.value || '0');
        const y = parseFloat(this.coordInputs.y?.value || '0');
        const z = parseFloat(this.coordInputs.z?.value || '0');

        if ([x, y, z].some((v) => Number.isNaN(v))) {
            this.setStatus('Enter numeric values for X, Y, and Z.');
            return;
        }

        const position = new THREE.Vector3(x, y, z);
        const distance = position.length();
        if (distance > this.sphereRadius) {
            position.setLength(this.sphereRadius - 0.2);
            this.setStatus('Point nudged inside the sphere for resonance.', true);
        } else {
            this.setStatus('Resonance seeded inside the sphere.', true);
        }

        const hue = THREE.MathUtils.mapLinear(position.y, -this.sphereRadius, this.sphereRadius, 0.58, 0.03);
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
        noteMesh.position.copy(position);
        noteMesh.castShadow = false;
        this.noteGroup.add(noteMesh);

        const noteData = {
            position,
            mesh: noteMesh
        };
        this.notes.push(noteData);
        this.updateNoteList();
    }

    removeNote(index) {
        if (index < 0 || index >= this.notes.length) return;
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

    updateNoteList() {
        if (!this.noteListEl) return;
        this.noteListEl.innerHTML = '';

        this.notes.forEach((note, index) => {
            const li = document.createElement('li');
            const coords = note.position;
            const label = `X ${coords.x.toFixed(2)} · Y ${coords.y.toFixed(2)} · Z ${coords.z.toFixed(2)}`;
            li.innerHTML = `<span>${label}</span>`;
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.textContent = 'Remove';
            removeBtn.dataset.index = String(index);
            li.appendChild(removeBtn);
            this.noteListEl.appendChild(li);
        });

        if (this.notes.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No resonances yet — drop a point to begin.';
            this.noteListEl.appendChild(li);
        }
    }

    playComposition() {
        if (this.notes.length === 0) {
            this.setStatus('Add at least one resonance point before playing.');
            return;
        }

        this.stopPlayback();

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

        this.notes.forEach((note, index) => {
            const startOffset = index * 0.7 + this.mapToDelay(note.position);
            const osc = context.createOscillator();
            const gain = context.createGain();
            const pan = context.createStereoPanner();

            osc.type = this.mapToWave(note.position);
            osc.frequency.setValueAtTime(this.mapToFrequency(note.position), now + startOffset);

            const gainValue = this.mapToGain(note.position);
            gain.gain.setValueAtTime(0.0001, now + startOffset);
            gain.gain.exponentialRampToValueAtTime(gainValue, now + startOffset + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + 0.6);

            pan.pan.setValueAtTime(this.mapToPan(note.position), now + startOffset);

            osc.connect(gain);
            gain.connect(pan);
            pan.connect(masterGain);

            osc.start(now + startOffset);
            osc.stop(now + startOffset + 0.7);
        });

        const duration = this.notes.length * 0.7 + 1.5;
        this.setStatus('Live mix playing — listen in motion.', true);
        this.activeTimeout = window.setTimeout(() => {
            this.setStatus('Playback complete. Ready for the next constellation.');
            this.stopPlayback();
        }, duration * 1000);
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
        if (this.notes.length === 0) {
            this.setStatus('Add resonances before exporting a mix.');
            return;
        }

        const sampleRate = 44100;
        const duration = this.notes.length * 0.7 + 2;
        const offline = new OfflineAudioContext(2, Math.ceil(sampleRate * duration), sampleRate);

        const masterGain = offline.createGain();
        masterGain.gain.setValueAtTime(0.9, 0);
        masterGain.connect(offline.destination);

        this.notes.forEach((note, index) => {
            const startOffset = index * 0.7 + this.mapToDelay(note.position) + 0.5;
            const osc = offline.createOscillator();
            const gain = offline.createGain();
            const pan = offline.createStereoPanner();

            osc.type = this.mapToWave(note.position);
            osc.frequency.setValueAtTime(this.mapToFrequency(note.position), startOffset);

            const gainValue = this.mapToGain(note.position);
            gain.gain.setValueAtTime(0.0001, startOffset);
            gain.gain.exponentialRampToValueAtTime(gainValue, startOffset + 0.08);
            gain.gain.exponentialRampToValueAtTime(0.0001, startOffset + 0.75);

            pan.pan.setValueAtTime(this.mapToPan(note.position), startOffset);

            osc.connect(gain);
            gain.connect(pan);
            pan.connect(masterGain);

            osc.start(startOffset);
            osc.stop(startOffset + 0.9);
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

    mapToFrequency(vector) {
        const min = 180;
        const max = 840;
        const normalized = THREE.MathUtils.clamp((vector.y + this.sphereRadius) / (this.sphereRadius * 2), 0, 1);
        return min + (max - min) * normalized;
    }

    mapToGain(vector) {
        const normalized = THREE.MathUtils.clamp((vector.length() / this.sphereRadius), 0, 1);
        return 0.18 + normalized * 0.55;
    }

    mapToDelay(vector) {
        return THREE.MathUtils.clamp((vector.z + this.sphereRadius) / (this.sphereRadius * 2), 0, 1) * 0.6;
    }

    mapToPan(vector) {
        return THREE.MathUtils.clamp(vector.x / this.sphereRadius, -1, 1);
    }

    mapToWave(vector) {
        const normalized = THREE.MathUtils.clamp((vector.x + this.sphereRadius) / (this.sphereRadius * 2), 0, 1);
        if (normalized < 0.33) return 'sine';
        if (normalized < 0.66) return 'triangle';
        return 'sawtooth';
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

        // RIFF identifier
        writeString('RIFF'); offset += 4;
        view.setUint32(offset, 36 + buffer.length * numOfChan * 2, true); offset += 4;
        writeString('WAVE'); offset += 4;
        writeString('fmt '); offset += 4;
        view.setUint32(offset, 16, true); offset += 4; // chunk size
        view.setUint16(offset, 1, true); offset += 2; // PCM format
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
