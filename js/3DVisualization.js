/**
 * 3D Immersive Audio Visualization
 * Creates an immersive experience with spatial audio from six directions
 */

class AudioVisualizer3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.speakers = [];
        this.soundWaves = [];
        this.listener = null;
        this.joystick = null;
        this.rotationAngle = 0;
        this.isRotating = false;
        this.rotationSpeed = 0;
        this.container = document.getElementById('scene-container');
        this.joystickContainer = document.getElementById('joystick-container');
        this.isDragging = false;
        this.lastMouseX = 0;
        this.dragSensitivity = 0.01; // Sensitivity factor for drag rotation
        this.topdownCanvas = document.getElementById('topdown-canvas');
        this.topdownCtx = this.topdownCanvas ? this.topdownCanvas.getContext('2d') : null;

        // Initialize everything
        this.init();
        this.setupJoystick();
        this.setupDragControls(); // Add drag controls
        this.initTopdownView(); // Initialize 2D visualization
        this.animate();
        
        // Connect to window resize events
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Create camera with wider field of view for more immersion
        const fov = 85;
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const near = 0.1;
        const far = 1000;
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.camera.position.set(0, 1.7, 0.5); // Position at typical human height
        
        // Create renderer with better quality settings
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: "high-performance" 
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Add better lighting
        this.addLighting();
        
        // Create environment
        this.createEnvironment();
        
        // Create hexagonal speaker arrangement
        this.createSpeakers();
        
        // Create listener avatar
        this.createListener();
    }
    
    addLighting() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x333333, 0.5);
        this.scene.add(ambientLight);
        
        // Add directional light with shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(-5, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        this.scene.add(directionalLight);
        
        // Add subtle colored accent lights
        const orangeLight = new THREE.PointLight(0xe69138, 0.3, 15);
        orangeLight.position.set(3, 2, -3);
        this.scene.add(orangeLight);
        
        const blueLight = new THREE.PointLight(0x4d88ff, 0.3, 15);
        blueLight.position.set(-3, 2, 3);
        this.scene.add(blueLight);
        
        // Create a subtle glow effect for the entire scene
        const ambientGlow = new THREE.AmbientLight(0xe69138, 0.1);
        this.scene.add(ambientGlow);
    }
    
    createEnvironment() {
        // Create studio floor with better texture
        const floorSize = 30;
        const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.1;
        floor.receiveShadow = true;
        this.scene.add(floor);
        
        // Add grid to help with spatial orientation
        const gridHelper = new THREE.GridHelper(floorSize, floorSize / 2, 0x444444, 0x222222);
        gridHelper.position.y = -0.09;
        this.scene.add(gridHelper);
        
        // Add a subtle fog effect for depth
        this.scene.fog = new THREE.FogExp2(0x000000, 0.035);
        
        // Create an outer ring to represent the audio bounds
        const ringGeometry = new THREE.RingGeometry(7, 7.2, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xe69138, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.4
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -0.08;
        this.scene.add(ring);

        // Add text panels to the environment walls
        this.addTextPanels();
    }

    // Helper function to create text panels
    createTextPanel(text, position, rotationY, width = 4, height = 2) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const canvasWidth = 1024; // Texture resolution width
        const canvasHeight = 512; // Texture resolution height
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Panel background
        context.fillStyle = 'rgba(30, 30, 30, 0.7)'; // Semi-transparent dark background
        context.fillRect(0, 0, canvasWidth, canvasHeight);
        context.strokeStyle = '#e69138'; // Orange border
        context.lineWidth = 15;
        context.strokeRect(0, 0, canvasWidth, canvasHeight);

        // Text properties
        context.fillStyle = '#f0f0f0'; // Light text color
        context.font = 'bold 48px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // Simple text wrapping (basic)
        const words = text.split(' ');
        let line = '';
        const lines = [];
        const maxWidth = canvasWidth * 0.9; // Max width for text
        const lineHeight = 60;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);

        // Draw wrapped text
        const startY = (canvasHeight - (lines.length - 1) * lineHeight) / 2;
        for (let i = 0; i < lines.length; i++) {
            context.fillText(lines[i].trim(), canvasWidth / 2, startY + i * lineHeight);
        }

        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9 // Slightly transparent panel
        });

        // Create plane geometry
        const geometry = new THREE.PlaneGeometry(width, height);
        const panel = new THREE.Mesh(geometry, material);

        // Set position and rotation
        panel.position.copy(position);
        panel.rotation.y = rotationY;

        this.scene.add(panel);
        return panel;
    }

    // Helper function to create title panels (no border/background)
    createTitlePanel(title, subtitle, position, rotationY, width = 6, height = 3) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const canvasWidth = 1024; // Texture resolution width
        const canvasHeight = 512; // Texture resolution height
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Transparent background
        context.fillStyle = 'rgba(0, 0, 0, 0)';
        context.fillRect(0, 0, canvasWidth, canvasHeight);

        // Title Text properties
        context.fillStyle = '#f0f0f0'; // Light text color
        context.font = 'bold 96px Arial'; // Larger, bold font for title
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(title, canvasWidth / 2, canvasHeight / 2 - 40); // Position title slightly above center

        // Subtitle Text properties
        context.font = 'italic 48px Arial'; // Smaller, italic font for subtitle
        context.fillStyle = '#cccccc'; // Slightly dimmer color for subtitle
        context.fillText(subtitle, canvasWidth / 2, canvasHeight / 2 + 60); // Position subtitle below title

        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1 // Fully opaque text on transparent background
        });

        // Create plane geometry
        const geometry = new THREE.PlaneGeometry(width, height);
        const panel = new THREE.Mesh(geometry, material);

        // Set position and rotation
        panel.position.copy(position);
        panel.rotation.y = rotationY;

        this.scene.add(panel);
        return panel;
    }

    addTextPanels() {
        const panelRadius = 12; // Distance from center for the panels
        const panelHeight = 2.5; // Height of the panels from the floor
        const panelWidth = 6; // Use the larger width for all panels for consistency
        const panelHeightDim = 3; // Use the larger height for all panels for consistency
        const titlePanelIndex = 3; // Index corresponding to the space between speakers 1 and 2 (180 degrees)

        const texts = [
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
            "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
            "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
            "TITLE_PLACEHOLDER", // Placeholder for the title panel
            "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.",
            "Eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo."
        ];

        const titleText = "Spatial Visualization";
        const subtitleText = "A 3D experience for the Boulez l'ombre double";

        const numPanels = texts.length;
        for (let i = 0; i < numPanels; i++) {
            const angle = (i / numPanels) * Math.PI * 2; // Distribute panels evenly
            const x = panelRadius * Math.sin(angle);
            const z = panelRadius * Math.cos(angle);
            const position = new THREE.Vector3(x, panelHeight, z);

            // Calculate rotation to face the center (0, panelHeight, 0)
            const rotationY = Math.atan2(x, z) + Math.PI; // Add PI to face inwards

            if (i === titlePanelIndex) {
                // Create the title panel
                this.createTitlePanel(titleText, subtitleText, position, rotationY, 8, 4);
            } else {
                // Create a regular text panel
                this.createTextPanel(texts[i], position, rotationY, panelWidth, panelHeightDim);
            }
        }
    }

    createSpeakers() {
        // Create 6 speakers in a hexagon arrangement with specific positioning
        const radius = 7; // Distance from center
        
        // Define specific angles for each speaker (in degrees)
        // Speaker 1: left front, Speaker 2: right front, then clockwise around the hexagon
        const speakerAngles = [
            210, // Speaker 1 (left front)
            150, // Speaker 2 (right front)
            90,  // Speaker 3 (right)
            30,  // Speaker 4 (right back)
            330, // Speaker 5 (left back)
            270  // Speaker 6 (left)
        ].map(deg => (deg * Math.PI) / 180); // Convert to radians
        
        // Create a more detailed speaker model
        for (let i = 0; i < 6; i++) {
            const angle = speakerAngles[i];
            const x = radius * Math.sin(angle);
            const z = radius * Math.cos(angle);

            // Create a speaker group for each position
            const speakerGroup = new THREE.Group();
            speakerGroup.position.set(x, 0.5, z);
            speakerGroup.lookAt(0, 0.5, 0); // Point speakers toward the center
            
            // Speaker box
            const boxGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.6);
            const boxMaterial = new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 0.5,
                metalness: 0.7
            });
            const box = new THREE.Mesh(boxGeometry, boxMaterial);
            box.castShadow = true;
            box.receiveShadow = true;
            speakerGroup.add(box);
            
            // Speaker cone (driver)
            const coneGeometry = new THREE.CircleGeometry(0.3, 32);
            const coneMaterial = new THREE.MeshStandardMaterial({
                color: 0xe69138,
                emissive: 0xe69138,
                emissiveIntensity: 0.2,
                roughness: 0.3
            });
            const cone = new THREE.Mesh(coneGeometry, coneMaterial);
            cone.position.z = 0.31; // Position slightly in front of the box
            speakerGroup.add(cone);
            
            // Speaker stands
            const standGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
            const standMaterial = new THREE.MeshStandardMaterial({
                color: 0x222222,
                roughness: 0.8,
                metalness: 0.5
            });
            const stand = new THREE.Mesh(standGeometry, standMaterial);
            stand.position.y = -1.1;
            stand.castShadow = true;
            stand.receiveShadow = true;
            speakerGroup.add(stand);

            // Add speaker number using a simple approach (no TextGeometry)
            const numberMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
            
            // Create a simple number indicator
            const numberPlate = new THREE.Mesh(
                new THREE.PlaneGeometry(0.3, 0.3),
                numberMaterial
            );
            numberPlate.position.set(0, 0.7, 0.31);
            
            // Use a canvas texture to display the number
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, 64, 64);
            ctx.font = 'bold 40px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${i+1}`, 32, 32);
            
            const numberTexture = new THREE.CanvasTexture(canvas);
            numberPlate.material = new THREE.MeshBasicMaterial({ 
                map: numberTexture,
                transparent: true
            });
            
            speakerGroup.add(numberPlate);
            
            speakerGroup.userData = { 
                index: i, 
                gainNode: null,
                originalEmissive: 0.2
            };
            
            this.speakers.push(speakerGroup);
            this.scene.add(speakerGroup);
        }
    }

    createListener() {
        // Create a more detailed avatar representing the listener
        const listener = new THREE.Group();
        
        // Create head - make it translucent
        const headGeometry = new THREE.SphereGeometry(0.25, 32, 32);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xf0f0f0,
            roughness: 0.6,
            transparent: true,
            opacity: 0.0314  // 20% opacity as requested
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.7;
        head.castShadow = true;
        head.receiveShadow = true;
        listener.add(head);
        
        // Create body - also make it translucent
        const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.15, 0.6, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3366cc,
            roughness: 0.7,
            transparent: true,
            opacity: 0.0314  // 20% opacity as requested
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1.3;
        body.castShadow = true;
        body.receiveShadow = true;
        listener.add(body);
        
        // Create ears to represent audio orientation
        const earGeometry = new THREE.BoxGeometry(0.05, 0.1, 0.05);
        const earMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xf0f0f0,
            transparent: true,
            opacity: 0.0314  // 20% opacity as requested
        });
        
        const leftEar = new THREE.Mesh(earGeometry, earMaterial);
        leftEar.position.set(-0.25, 1.7, 0);
        listener.add(leftEar);
        
        const rightEar = new THREE.Mesh(earGeometry, earMaterial);
        rightEar.position.set(0.25, 1.7, 0);
        listener.add(rightEar);
        
        // Create direction indicator (nose)
        const noseGeometry = new THREE.ConeGeometry(0.05, 0.1, 16);
        const noseMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff6666,
            transparent: true,
            opacity: 0.0314  // 20% opacity as requested
        });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.position.set(0, 1.7, 0.25);
        nose.rotation.x = -Math.PI / 2;
        listener.add(nose);
        
        this.listener = listener;
        this.scene.add(listener);
    }

    setupJoystick() {
        // Destroy any existing joystick
        if (this.joystick) {
            this.joystick.destroy();
        }
        
        // Create virtual joystick with improved settings
        this.joystick = nipplejs.create({
            zone: this.joystickContainer,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'rgba(230, 145, 56, 0.8)',
            size: 100,
            lockX: false, // Allow movement in all directions
            lockY: false,
            dynamicPage: true
        });
        
        // Add joystick event listeners
        this.joystick.on('move', (event, data) => {
            // Calculate rotation based on joystick angle
            if (data.distance > 20) { // Add minimum threshold to prevent accidental moves
                // Map joystick X axis to rotation speed - more intuitive control
                const maxRotation = 3; // Max rotation speed in degrees per frame
                // Invert the X value to make left drag rotate left and right drag rotate right
                this.rotationSpeed = (-data.vector.x * maxRotation) * (Math.PI / 180);
                this.isRotating = true;
            }
        });
        
        this.joystick.on('end', () => {
            // Add some inertia for smoother stopping
            this.isRotating = false;
            // Gradually reduce rotation speed instead of immediate stop
            const slowdown = () => {
                if (Math.abs(this.rotationSpeed) > 0.01) {
                    this.rotationSpeed *= 0.9; // Reduce speed by 10% each frame
                    setTimeout(slowdown, 16); // ~60fps
                } else {
                    this.rotationSpeed = 0;
                }
            };
            slowdown();
        });
    }

    setupDragControls() {
        // Mouse events
        this.container.addEventListener('mousedown', this.onDragStart.bind(this));
        window.addEventListener('mousemove', this.onDragMove.bind(this));
        window.addEventListener('mouseup', this.onDragEnd.bind(this));
        
        // Touch events for mobile
        this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        window.addEventListener('touchend', this.onTouchEnd.bind(this));
    }
    
    onDragStart(event) {
        // Only activate if the event is directly on the container (avoid UI elements)
        if (event.target !== this.container && event.target !== this.renderer.domElement) {
            return;
        }
        
        this.isDragging = true;
        this.lastMouseX = event.clientX;
    }
    
    onDragMove(event) {
        if (!this.isDragging) return;
        
        // Calculate how far the mouse has moved since the last event
        const deltaX = event.clientX - this.lastMouseX;
        this.lastMouseX = event.clientX;
        
        // Apply rotation with positive deltaX to invert the drag direction
        // Now: Drag right = rotate left, drag left = rotate right
        // (like grabbing and moving the world)
        this.rotationAngle += deltaX * this.dragSensitivity;
        
        // Update the rotation immediately for a responsive feel
        this.updateListenerRotation();
    }
    
    onDragEnd() {
        this.isDragging = false;
    }
    
    // Touch event handlers
    onTouchStart(event) {
        // Prevent default behavior to avoid scrolling
        event.preventDefault();
        
        // Only activate if the event is directly on the container (avoid UI elements)
        if (event.target !== this.container && event.target !== this.renderer.domElement) {
            return;
        }
        
        if (event.touches.length === 1) {
            this.isDragging = true;
            this.lastMouseX = event.touches[0].clientX;
        }
    }
    
    onTouchMove(event) {
        if (!this.isDragging) return;
        event.preventDefault(); // Prevent scrolling
        
        if (event.touches.length === 1) {
            // Calculate how far the touch has moved since the last event
            const deltaX = event.touches[0].clientX - this.lastMouseX;
            this.lastMouseX = event.touches[0].clientX;
            
            // Apply rotation with positive deltaX to invert the drag direction
            // Now: Drag right = rotate left, drag left = rotate right
            this.rotationAngle += deltaX * this.dragSensitivity;
            
            // Update the rotation immediately for a responsive feel
            this.updateListenerRotation();
        }
    }
    
    onTouchEnd() {
        this.isDragging = false;
    }
    
    updateListenerRotation() {
        // Update the listener rotation
        this.listener.rotation.y = this.rotationAngle;
        
        // Update the camera position for better immersion
        const cameraDistance = 0.5; // Distance behind the listener
        this.camera.position.x = Math.sin(this.rotationAngle) * cameraDistance;
        this.camera.position.z = Math.cos(this.rotationAngle) * cameraDistance;
        this.camera.lookAt(0, 1.7, 0);
        
        // Send rotation to the audio context if it exists
        if (window.audioCtx && window.listener) {
            // Update the WebAudio API listener orientation
            window.listener.forwardX.value = Math.sin(this.rotationAngle);
            window.listener.forwardZ.value = Math.cos(this.rotationAngle);
        }
        
        // Update the 2D top-down view
        this.updateTopdownView();
    }

    updateRotation() {
        if (this.isRotating || Math.abs(this.rotationSpeed) > 0.01) {
            // Apply rotation
            this.rotationAngle += this.rotationSpeed;
            
            // Update all rotation-related elements
            this.updateListenerRotation();
        }
    }

    createSoundWave(speakerIndex, intensity) {
        // Skip if intensity is too low
        if (intensity < 0.1) return;
        
        const speaker = this.speakers[speakerIndex];
        if (!speaker) return;
        
        // Clone the speaker position for the wave
        const position = new THREE.Vector3();
        position.copy(speaker.position);
        
        // Create the wave with improved visuals
        const waveGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const waveColor = new THREE.Color(0xe69138);
        
        // Create a custom shader material for better wave effect
        const waveMaterial = new THREE.MeshBasicMaterial({
            color: waveColor,
            transparent: true,
            opacity: intensity * 0.8
        });
        
        const wave = new THREE.Mesh(waveGeometry, waveMaterial);
        wave.position.copy(position);
        wave.userData = {
            createdAt: Date.now(),
            duration: 1800, // Slightly longer wave duration in ms
            maxScale: 4 + intensity * 3, // Larger scale based on intensity
            speakerIndex,
            initialOpacity: intensity * 0.8
        };
        
        this.soundWaves.push(wave);
        this.scene.add(wave);
    }
    
    updateSoundWaves() {
        const now = Date.now();
        for (let i = this.soundWaves.length - 1; i >= 0; i--) {
            const wave = this.soundWaves[i];
            const age = now - wave.userData.createdAt;
            const progress = age / wave.userData.duration;
            
            if (progress >= 1) {
                // Remove old waves
                this.scene.remove(wave);
                wave.material.dispose();
                wave.geometry.dispose();
                this.soundWaves.splice(i, 1);
            } else {
                // Scale wave outward with easing
                const easeOutProgress = 1 - Math.pow(1 - progress, 2); // Ease out quad
                const scale = easeOutProgress * wave.userData.maxScale;
                wave.scale.set(scale, scale, scale);
                
                // Fade wave out
                wave.material.opacity = (1 - easeOutProgress) * wave.userData.initialOpacity;
            }
        }
    }

    updateSpeakers(gainNodes) {
        if (!gainNodes || !gainNodes.length) return;
        
        // Update each speaker's visualization based on its gain
        for (let i = 0; i < Math.min(this.speakers.length, gainNodes.length); i++) {
            const gain = gainNodes[i].gain.value;
            if (!this.speakers[i]) continue;
            
            // Store gain node reference for later
            this.speakers[i].userData.gainNode = gainNodes[i];
            
            // Find the cone (speaker driver) to update its glow
            this.speakers[i].children.forEach(child => {
                if (child instanceof THREE.Mesh && 
                    child.material && 
                    child.material.emissive) {
                    // Adjust emissive intensity based on gain - make it more pronounced
                    child.material.emissiveIntensity = gain > 0.1 ? 0.2 + gain * 5 : 0.2;
                    
                    // Also change the color based on activity for better visibility
                    if (gain > 0.1) {
                        child.material.emissive.setHex(0xff9500); // Brighter orange when active
                    } else {
                        child.material.emissive.setHex(0xe69138); // Default orange when inactive
                    }
                }
            });
            
            // Create sound waves with varying frequency based on gain
            const threshold = 0.1; // Minimum gain to create waves
            const baseChance = 0.15; // Increased chance for better visibility
            const chanceIncrease = 0.5; // How much the chance increases with gain
            
            if (gain > threshold && Math.random() < baseChance + (gain * chanceIncrease)) {
                this.createSoundWave(i, gain);
            }
        }
        
        // Update the 2D top-down view
        this.updateTopdownView();
    }

    onWindowResize() {
        if (!this.camera || !this.renderer || !this.container) return;
        
        // Get the actual visible area of the container
        const rect = this.container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        if (width <= 0 || height <= 0) return; // Avoid division by zero
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, true); // Set to CSS size with updateStyle=true
        
        // Recreate joystick to ensure proper positioning
        this.setupJoystick();
        
        // Reset drag state if window resizes during drag
        this.isDragging = false;
        
        // Update 2D visualization on resize
        if (this.topdownCanvas) {
            const canvasRect = this.topdownCanvas.getBoundingClientRect();
            this.topdownCanvas.width = canvasRect.width * window.devicePixelRatio;
            this.topdownCanvas.height = canvasRect.height * window.devicePixelRatio;
            this.updateTopdownView();
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        this.updateRotation();
        this.updateSoundWaves();
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
    
    // Method to reset view orientation
    resetOrientation() {
        this.rotationAngle = 0;
        this.rotationSpeed = 0;
        this.listener.rotation.y = 0;
        // Position camera between speakers 1 and 2, looking at center
        this.camera.position.set(0, 1.7, 0.5);
        this.camera.lookAt(0, 1.7, -10); // Look toward negative Z (between speakers 1 and 2)
        
        // Update WebAudio API listener orientation
        if (window.audioCtx && window.listener) {
            window.listener.forwardX.value = 0;
            window.listener.forwardY.value = 0;
            window.listener.forwardZ.value = -1; // Looking toward negative Z
        }
    }

    initTopdownView() {
        if (!this.topdownCanvas) return;
        
        // Set canvas width and height based on its display size
        const rect = this.topdownCanvas.getBoundingClientRect();
        this.topdownCanvas.width = rect.width * window.devicePixelRatio;
        this.topdownCanvas.height = rect.height * window.devicePixelRatio;
        
        // Draw the initial state
        this.updateTopdownView();
    }
    
    updateTopdownView() {
        if (!this.topdownCtx || !this.topdownCanvas) return;
        
        const ctx = this.topdownCtx;
        const width = this.topdownCanvas.width;
        const height = this.topdownCanvas.height;
        const radius = Math.min(width, height) / 2.5; // Radius for speakers circle
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Clear the canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw a subtle grid for reference
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.lineWidth = 1;
        
        // Draw grid lines
        for (let i = 1; i < 5; i++) {
            const pos = (i / 5) * width;
            ctx.beginPath();
            ctx.moveTo(pos, 0);
            ctx.lineTo(pos, height);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(0, pos);
            ctx.lineTo(width, pos);
            ctx.stroke();
        }
        
        // Draw outer circle representing the speaker arrangement
        ctx.strokeStyle = '#e69138';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Define speaker positions with corrected gain node mappings
        const speakerPositions = [
            { angle: 210, label: 5, gainNode: 4 }, // Speaker 1 (left front) - uses gain node 4
            { angle: 150, label: 4, gainNode: 3 }, // Speaker 2 (right front) - uses gain node 3
            { angle: 90, label: 3, gainNode: 2 },  // Speaker 3 (right) - unchanged
            { angle: 30, label: 2, gainNode: 1 },  // Speaker 4 (right back) - uses gain node 1
            { angle: 330, label: 1, gainNode: 0 }, // Speaker 5 (left back) - uses gain node 0
            { angle: 270, label: 6, gainNode: 5 }  // Speaker 6 (left) - unchanged
        ];
        
        // Draw anticipation lanes first (so they're behind the speakers)
        this.drawAnticipationLanes(ctx, centerX, centerY, radius, speakerPositions);
        
        // Draw each speaker
        speakerPositions.forEach(speaker => {
            // Convert angle to radians
            const angleRad = (speaker.angle * Math.PI) / 180;
            
            // Calculate position based on the angle
            const x = centerX + radius * Math.sin(angleRad);
            const y = centerY - radius * Math.cos(angleRad); // Inverted Y for canvas
            
            // Check if this speaker is active by examining its corresponding gain node
            const isActive = window.gainNodes && 
                             speaker.gainNode < window.gainNodes.length && 
                             window.gainNodes[speaker.gainNode].gain.value > 0.1;
            
            // Draw speaker dot with appropriate color
            ctx.fillStyle = isActive ? '#ff9500' : '#666666';
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2);
            ctx.fill();
            
            // Add a pulsing glow for active speakers
            if (isActive) {
                const gain = window.gainNodes[speaker.gainNode].gain.value;
                const pulseSize = 20 + Math.sin(Date.now() / 200) * 5; // Pulsing effect
                const glowSize = 20 + pulseSize * gain;
                
                // Draw glow
                const gradient = ctx.createRadialGradient(x, y, 20, x, y, glowSize);
                gradient.addColorStop(0, 'rgba(255, 149, 0, 0.7)');
                gradient.addColorStop(1, 'rgba(255, 149, 0, 0)');
                
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(x, y, glowSize, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Draw speaker number with improved visibility
            ctx.font = 'bold 11px Arial';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(speaker.label, x, y);
        });
        
        // Draw listener using the image
        if (this.listenerImageLoaded) {
            // Fallback if image isn't loaded yet
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw a clear white directional arrow with corrected rotation
        // Use negative angle to make it rotate in the same direction as the 3D view
        const angle = -this.rotationAngle;
        const arrowLength = 30; // Make the arrow longer
        const arrowWidth = 20;   // Make the arrow wider
        
        // Calculate arrow endpoint
        const arrowX = centerX + Math.sin(angle) * arrowLength;
        const arrowY = centerY - Math.cos(angle) * arrowLength;
        
        // Draw arrow stem with thicker white line
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(arrowX, arrowY);
        ctx.stroke();
        
        // Draw arrowhead
        const headLength = 20;
        const headWidth = 10;
        
        // Calculate the arrow direction vector
        const dx = Math.sin(angle);
        const dy = -Math.cos(angle);
        
        // Calculate points for arrowhead
        const arrowPoint1X = arrowX - headLength * dx + headWidth * dy;
        const arrowPoint1Y = arrowY - headLength * dy - headWidth * dx;
        
        const arrowPoint2X = arrowX - headLength * dx - headWidth * dy;
        const arrowPoint2Y = arrowY - headLength * dy + headWidth * dx;
        
        // Draw arrowhead as a filled triangle
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowPoint1X, arrowPoint1Y);
        ctx.lineTo(arrowPoint2X, arrowPoint2Y);
        ctx.closePath();
        ctx.fill();
    }

    drawAnticipationLanes(ctx, centerX, centerY, speakerCircleRadius, speakerPositions) {
        // Only proceed if we have timestamps and patterns
        if (!window.timestamps || !window.presets || !window.audioElement) return;
        
        const currentTime = window.audioElement.currentTime;
        const maxLookAheadTime = 5; // Look ahead 5 seconds
        const laneLength = speakerCircleRadius * 1.8; // Extend lanes further outward (180%)
        
        // Add a pulsing effect to the entire canvas to draw attention to it
        const globalPulse = (Math.sin(Date.now() / 1000) * 0.05) + 0.95; // 0.9-1.0 range
        ctx.globalAlpha = globalPulse;
        
        // First draw a subtle radial gradient background for the entire lane system
        const outerGradient = ctx.createRadialGradient(
            centerX, centerY, speakerCircleRadius * 0.8,
            centerX, centerY, speakerCircleRadius + laneLength
        );
        outerGradient.addColorStop(0, 'rgba(230, 145, 56, 0.05)');
        outerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = outerGradient;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        
        // Draw lanes for each speaker
        speakerPositions.forEach(speaker => {
            const angleRad = (speaker.angle * Math.PI) / 180;
            const speakerX = centerX + speakerCircleRadius * Math.sin(angleRad);
            const speakerY = centerY - speakerCircleRadius * Math.cos(angleRad);
            
            // Calculate outer point of lane
            const outerX = centerX + (speakerCircleRadius + laneLength) * Math.sin(angleRad);
            const outerY = centerY - (speakerCircleRadius + laneLength) * Math.cos(angleRad);
            
            // Draw lane background with gradient for depth perception
            ctx.save();
            const laneGradient = ctx.createLinearGradient(speakerX, speakerY, outerX, outerY);
            laneGradient.addColorStop(0, 'rgba(255, 149, 0, 0.4)');
            laneGradient.addColorStop(1, 'rgba(255, 149, 0, 0.1)');
            
            ctx.strokeStyle = laneGradient;
            ctx.lineWidth = 25; // Much wider lane
            ctx.beginPath();
            ctx.moveTo(speakerX, speakerY);
            ctx.lineTo(outerX, outerY);
            ctx.stroke();
            
            // Add lane markings for better visual tracking
            const dashCount = 10;
            const dashSpacing = laneLength / dashCount;
            ctx.globalAlpha = 0.5;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            
            const dx = (outerX - speakerX) / dashCount;
            const dy = (outerY - speakerY) / dashCount;
            
            // Draw dashed lane markers
            for (let i = 1; i < dashCount; i++) {
                const x = speakerX + dx * i;
                const y = speakerY + dy * i;
                
                // Draw circle markers along the lane
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${0.7 - (i / dashCount) * 0.5})`;
                ctx.fill();
            }
            
            ctx.restore();
            
            // Calculate upcoming activations for this speaker
            this.drawUpcomingActivations(
                ctx, 
                currentTime,
                maxLookAheadTime,
                speaker.gainNode,
                speakerX, speakerY,
                outerX, outerY,
                speakerCircleRadius,
                laneLength
            );
        });
    }

    drawUpcomingActivations(ctx, currentTime, lookAheadTime, gainNodeIndex, speakerX, speakerY, outerX, outerY, speakerRadius, laneLength) {
        // Get the timestamps and patterns
        const timestamps = window.timestamps;
        const presets = window.presets;
        
        // Calculate the direction vector of the lane
        const dirX = outerX - speakerX;
        const dirY = outerY - speakerY;
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        const normDirX = dirX / length;
        const normDirY = dirY / length;
        
        // Find upcoming pattern changes
        for (let i = 0; i < timestamps.length - 1; i++) {
            const startTime = timestamps[i];
            const endTime = timestamps[i+1];
            
            // Skip if this pattern change is in the past
            if (endTime < currentTime) continue;
            
            // Skip if this pattern change is too far in the future
            if (startTime > currentTime + lookAheadTime) break;
            
            // Check if this speaker is active in the pattern
            const isActive = presets[i][gainNodeIndex] > 0;
            if (!isActive) continue;
            
            // Calculate the position of the activation bar
            // Time difference between pattern change and now
            const timeToChange = startTime - currentTime;
            
            // Position along the lane (0 = at speaker, 1 = at outer edge)
            const position = Math.min(Math.max(timeToChange / lookAheadTime, 0), 1);
            
            // Actual coordinates
            const barX = speakerX + position * dirX;
            const barY = speakerY + position * dirY;
            
            // Draw the activation bar - enhanced for prominence
            const barWidth = 28; // Much wider for visibility
            const barLength = laneLength / 5; // Longer tile (1/5 of lane length)
            
            // Draw activation bar
            ctx.save();
            
            // Rotate context to align with lane direction
            const angle = Math.atan2(dirY, dirX);
            ctx.translate(barX, barY);
            ctx.rotate(angle);
            
            // Apply special effects for tiles approaching the speaker
            const isNear = position < 0.25;
            const isVeryNear = position < 0.1;
            
            // Add animation effects
            if (isVeryNear) {
                // Pulse effect for very close tiles
                const pulseScale = 1 + Math.sin(Date.now() / 100) * 0.2;
                ctx.scale(pulseScale, pulseScale);
            }
            
            // Create a strong glow effect for all tiles
            ctx.shadowBlur = isNear ? 20 : 10;
            ctx.shadowColor = isNear ? '#ff9500' : '#e69138';
            
            // Make closer tiles much more prominent with animation
            const intensity = 1 - position; // 0 to 1, with 1 being closest to speaker
            const color = isVeryNear ? '#ffffff' : (isNear ? '#ff9500' : '#e69138');
            
            // Draw tile background with gradient and animation
            const gradientWidth = barLength * (1 + Math.sin(Date.now() / 400) * 0.1);
            const gradient = ctx.createLinearGradient(-gradientWidth/2, 0, gradientWidth/2, 0);
            
            // More vibrant colors
            gradient.addColorStop(0, `rgba(255, 149, 0, ${0.6 + intensity * 0.4})`);
            gradient.addColorStop(0.5, `rgba(255, 180, 50, ${0.8 + intensity * 0.2})`);
            gradient.addColorStop(1, `rgba(255, 149, 0, ${0.6 + intensity * 0.4})`);
            
            ctx.fillStyle = gradient;
            
            // Draw the piano tile
            ctx.fillRect(-barLength/2, -barWidth/2, barLength, barWidth);
            
            // Add border and highlights for better definition
            ctx.strokeStyle = color;
            ctx.lineWidth = isVeryNear ? 4 : (isNear ? 3 : 2);
            ctx.strokeRect(-barLength/2, -barWidth/2, barLength, barWidth);
            
            // Add musical note symbol for visual interest
            ctx.fillStyle = isVeryNear ? '#ff9500' : '#FFFFFF';
            ctx.font = `bold ${Math.round(barLength/2.5)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Different symbols for variety
            const symbols = ['♪', '♫', '♬', '♩'];
            const symbolIndex = Math.floor(i % symbols.length);
            ctx.fillText(symbols[symbolIndex], 0, 0);
            
            // Add secondary glows
            if (isNear) {
                ctx.beginPath();
                ctx.arc(0, 0, barLength/3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fill();
            }
            
            ctx.restore();
        }
    }

    /**
     * Move camera to a specific position
     */
    moveCamera(x, y, z) {
        this.camera.position.set(x, y, z);
        
        // If we're at the center (audio engineer mode), look down slightly
        this.camera.lookAt(0, 1.7, -10)
        
        // this.camera.lookAt(0, y/2, 0);

        // if (x === 0 && z === 0) {
        //     // Look at the floor slightly in front of us
        //     this.camera.lookAt(0, 0, -1);
        // } else {
        //     // Otherwise look at the center
        //     this.camera.lookAt(0, y/2, 0);
        // }
    }
    
    /**
     * Move to a specific speaker's position and orientation
     */
    moveToSpeakerPosition(speakerIndex) {
        if (speakerIndex < 0 || speakerIndex >= this.speakers.length) return;
        
        // Get the speaker object
        const speaker = this.speakers[speakerIndex];
        if (!speaker) return;
        
        // Get speaker position
        const position = speaker.position.clone();
        
        // Move slightly behind the speaker (as if standing there)
        const centerDirection = new THREE.Vector3(0, position.y, 0).sub(position).normalize();
        position.add(centerDirection.multiplyScalar(-0.5)); // Step back a bit
        
        // Set camera position to be at person height
        position.y = 1.7;
        this.camera.position.copy(position);
        
        // Look at the center
        this.camera.lookAt(0, position.y, 0);
        
        // Update speaker highlight
        this.highlightSpeaker(speakerIndex);
    }
    
    /**
     * Highlight the selected speaker in performer mode
     */
    highlightSpeaker(speakerIndex) {
        // Reset all speakers to normal appearance
        this.speakers.forEach((speaker, index) => {
            speaker.children.forEach(child => {
                if (child instanceof THREE.Mesh && 
                    child.material && 
                    child.material.color) {
                    
                    // Reset color to normal
                    if (index !== speakerIndex) {
                        if (child.material.color.getHexString() === 'e69138') {
                            // For the cone, reset to orange
                            child.material.color.setHex(0xe69138);
                            if (child.material.emissive) {
                                child.material.emissive.setHex(0xe69138);
                            }
                        } else {
                            // For other parts, reset to dark gray
                            child.material.color.setHex(0x333333);
                        }
                    }
                }
            });
        });
        
        // Highlight the selected speaker
        if (this.speakers[speakerIndex]) {
            this.speakers[speakerIndex].children.forEach(child => {
                if (child instanceof THREE.Mesh && 
                    child.material && 
                    child.material.color) {
                    
                    // Highlight with bright color
                    child.material.color.setHex(0x00ff00);
                    if (child.material.emissive) {
                        child.material.emissive.setHex(0x00ff00);
                        child.material.emissiveIntensity = 0.5;
                    }
                }
            });
        }
    }
}

// Initialize the 3D visualizer when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a moment to ensure all DOM elements are ready
    setTimeout(() => {
        window.visualizer3D = new AudioVisualizer3D();
        
        // Connect visualizer to existing gain nodes if available
        if (window.gainNodes) {
            window.visualizer3D.updateSpeakers(window.gainNodes);
        }
        
        // Add reset button functionality
        const resetButton = document.getElementById('resetButton');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                if (window.visualizer3D) {
                    window.visualizer3D.resetOrientation();
                }
            });
        }
        
        // Initialize with the current mode
        const activeBtn = document.querySelector('.mode-btn.active');
        if (activeBtn) {
            const mode = activeBtn.dataset.mode;
            if (window.setMode) {
                window.setMode(mode);
            }
        }
    }, 500);
});

// Add a method to the global scope that can be called from the existing audio code
window.updateVisualization3D = function(gainNodes) {
    if (window.visualizer3D) {
        window.visualizer3D.updateSpeakers(gainNodes);
    }
};

export default AudioVisualizer3D;
