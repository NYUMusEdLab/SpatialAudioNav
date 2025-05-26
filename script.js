/**
 * Enhanced Spatial Audio Implementation
 */

// Create variables to hold audio components (initialized on user interaction)
let audioCtx = null;
let audioSource = null;
let gainNodes = [];
let masterGain = null;
let panners = [];
let audioInitialized = false;

// Set constants for audio positioning
const posX = 0, posY = 1.7, posZ = 0;

// Application states
let currentMode = 'audience'; // Default to audience mode
let currentScene = 'default';
let isMixingMode = false;
let currentPerformerSpeakerIndex = 0; // For performer mode

// Audio effects for special scenes
let circularPanner = null;
let accelerationFactor = 1.0;
let resonator = null;
let dryWetMixer = null;
let wetGain = null;
let dryGain = null;

// Audio elements
let audioElements = {};
let currentAudioElement = null;

// Animation frames
let animationFrameId = null;

// Get the audio elements after DOM load
document.addEventListener('DOMContentLoaded', () => {
    audioElements = {
        'default': document.getElementById('double'),
        'transition1-2': document.getElementById('transition1-2'),
        'transition3-4': document.getElementById('transition3-4'),
        'stropheV': document.getElementById('stropheV'),
    }
    currentAudioElement = audioElements['default'];
    window.audioElement = currentAudioElement;
});

// Audio timestamps and patterns
const timestampPatterns = {
    default: {
        timestamps: [
            0, 1.483, 3.311, 4.59, 7.863, 11.365, 17.314, 18.926, 23.75, 
            31.035, 33.334, 36.547, 37.723, 40.114, 41.014, 42.203, 43.957, 
            45.172, 45.783, 47.39, 48.731, 50.323, 52.462, 55.005, 59.489, 
            63.377, 68.79
        ],
        patterns: [
            [1, 0, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0], [0, 0, 0, 0, 1, 0],
            [0, 1, 0, 0, 0, 0], [0, 0, 0, 0, 1, 0], [0, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0, 1], [0, 0, 1, 0, 0, 0], [0, 0, 1, 0, 0, 1],
            [0, 1, 0, 0, 1, 0], [0, 1, 0, 1, 0, 0], [1, 0, 0, 0, 0, 1],
            [1, 1, 0, 0, 0, 0], [0, 0, 0, 1, 1, 0], [0, 0, 1, 0, 0, 1],
            [0, 1, 1, 0, 0, 0], [0, 1, 1, 1, 0, 0], [0, 1, 0, 1, 1, 0],
            [1, 1, 0, 0, 1, 0], [1, 0, 0, 0, 1, 1], [0, 0, 0, 0, 0, 1],
            [0, 0, 0, 1, 0, 1], [1, 0, 0, 1, 0, 1], [1, 0, 1, 1, 0, 1],
            [1, 1, 1, 1, 0, 1], [1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0]
        ]
    },
    "transition1-2": {
        timestamps: [0, 1.2, 2.4, 3.6, 4.8, 6.0, 7.2, 8.4, 9.6, 10.8],
        patterns: [
            [1, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0],
            [0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 1, 0], [0, 1, 0, 1, 0, 0], [0, 0, 1, 0, 0, 1],
            [1, 1, 1, 1, 1, 1]
        ]
    },
    "transition3-4": {
        timestamps: [0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6, 6.4, 7.2],
        // Special rotating pattern handled by circular panner
        patterns: [
            [1, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0],
            [0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 1],
            [1, 1, 0, 0, 0, 0], [0, 0, 1, 1, 0, 0], [0, 0, 0, 0, 1, 1],
            [1, 1, 1, 1, 1, 1]
        ]
    },
    "stropheV": {
        timestamps: [0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0],
        patterns: [
            [1, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0],
            [0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 1],
            [1, 0, 0, 1, 0, 0], [0, 1, 0, 0, 1, 0], [0, 0, 1, 0, 0, 1],
            [1, 1, 1, 1, 1, 1]
        ]
    }
};

// Make current timestamps and patterns available globally
window.timestamps = timestampPatterns.default.timestamps;
window.presets = timestampPatterns.default.patterns;

// Mode-specific positions
const modePositions = {
    engineer: { x: 0, y: 2.5, z: 0 }, // Center of the room, slightly higher, not too high
    audience: { x: 0, y: 1.7, z: 2 },  // Back of the room
    performer: { x: 0, y: 1.7, z: -2 } // Front of the room (will be overridden)
};

// Speaker positions for performer mode
const speakerPositions = [
    { angle: 210, x: -6.1, y: 1.7, z: -3.5 }, // Speaker 1 (left front)
    { angle: 150, x: 6.1, y: 1.7, z: -3.5 },  // Speaker 2 (right front)
    { angle: 90, x: 7, y: 1.7, z: 0 },       // Speaker 3 (right)
    { angle: 30, x: 6.1, y: 1.7, z: 3.5 },   // Speaker 4 (right back)
    { angle: 330, x: -6.1, y: 1.7, z: 3.5 }, // Speaker 5 (left back)
    { angle: 270, x: -7, y: 1.7, z: 0 }      // Speaker 6 (left)
];

// Pattern switching variables
let patternInterval = null;
let currentPatternIndex = 0;

// UI Controls
const playPauseButton = document.getElementById('playPauseButton');
const resetButton = document.getElementById('resetButton');
const arabicPlayhead = document.getElementById('arabic-playhead'); // Get the new playhead element
const arabicContainer = document.getElementById('arabic-visualization-container'); // Get the container

if (!playPauseButton) console.error("Play/Pause button not found!");
if (!resetButton) console.error("Reset button not found!");
if (!arabicPlayhead) console.error("Arabic playhead element not found!");
if (!arabicContainer) console.error("Arabic visualization container not found!");

// Use a simple flag to track initialization attempts
let initializationAttempted = false;

// Function to initialize audio context with user gesture
function initAudioContext() {
    if (audioCtx) return Promise.resolve(); // Already initialized
    
    console.log("Initializing Audio Context...");
    
    return new Promise((resolve, reject) => {
        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext({ latencyHint: 'interactive' });
            
            // Make globally accessible
            window.audioCtx = audioCtx;
            window.listener = audioCtx.listener;
            
            // Configure basic settings immediately
            audioCtx.destination.channelCount = audioCtx.destination.maxChannelCount;
            audioCtx.destination.channelCountMode = "explicit";
            audioCtx.destination.channelInterpretation = "speakers";
            
            // Set listener position and orientation based on mode
            updateListenerPosition();
            
            console.log("Audio Context created. Setting up Web Audio...");
            
            // Set up audio connections
            setupWebAudio().then(() => {
                audioInitialized = true;
                console.log("Audio fully initialized!");
                resolve();
            }).catch(error => {
                console.error("Error during Web Audio setup:", error);
                // Still resolve since we at least have the AudioContext
                resolve();
            });
        } catch (error) {
            console.error("Failed to create Audio Context:", error);
            reject(error);
        }
    });
}

// Update listener position based on current mode
function updateListenerPosition() {
    if (!audioCtx || !audioCtx.listener) return;
    
    let position;
    
    // For performer mode, use the position of the selected speaker
    if (currentMode === 'performer' && speakerPositions[currentPerformerSpeakerIndex]) {
        position = speakerPositions[currentPerformerSpeakerIndex];
    } else {
        position = modePositions[currentMode];
    }
    
    // Set listener position
    const listener = audioCtx.listener;
    if (listener.positionX) {
        // Modern API
        listener.positionX.value = position.x;
        listener.positionY.value = position.y;
        listener.positionZ.value = position.z;
    } else {
        // Fallback for older browsers
        listener.setPosition(position.x, position.y, position.z);
    }
    
    // Set forward orientation based on mode
    let forwardX = 0, forwardY = 0, forwardZ = -1;
    
    if (currentMode === 'audience') {
        forwardZ = -1; // facing forward
    } else if (currentMode === 'performer') {
        // Calculate direction vector pointing toward the center
        forwardX = -position.x;
        forwardZ = -position.z;
        // Normalize the vector
        const length = Math.sqrt(forwardX * forwardX + forwardZ * forwardZ);
        if (length > 0) {
            forwardX /= length;
            forwardZ /= length;
        }
    }
    
    if (listener.forwardX) {
        // Modern API
        listener.forwardX.value = forwardX;
        listener.forwardY.value = forwardY;
        listener.forwardZ.value = forwardZ;
        listener.upX.value = 0;
        listener.upY.value = 1;
        listener.upZ.value = 0;
    } else {
        // Fallback
        listener.setOrientation(forwardX, forwardY, forwardZ, 0, 1, 0);
    }
}

// Function to set up all the Web Audio connections
function setupWebAudio() {
    return new Promise((resolve, reject) => {
        if (!audioCtx || !currentAudioElement) {
            reject(new Error("Missing AudioContext or audio element"));
            return;
        }
        
        // Create audio source from element
        try {
            audioSource = audioCtx.createMediaElementSource(currentAudioElement);
        } catch (e) {
            console.error("Error creating media element source:", e);
            
            // If already connected, just resolve
            if (e.message && e.message.includes('already connected')) {
                console.log("Audio element already connected to an audio context");
                resolve();
                return;
            }
            
            reject(e);
            return;
        }
        
        console.log("Audio source created successfully");
        
        // Create spatial audio setup
        try {
            // Create 6 audio sources in a hexagonal arrangement
            const speakerRadius = 7;
            const sources = Array.from({ length: 6 }, (_, i) => getHexPosition(i, speakerRadius));
            
            // Create simplified panners
            panners = sources.map(source => {
                return new PannerNode(audioCtx, {
                    panningModel: "HRTF",
                    distanceModel: "inverse",
                    positionX: source.x,
                    positionY: source.y,
                    positionZ: source.z,
                    refDistance: 2,
                    maxDistance: 10
                });
            });
            
            // Create gain nodes and master gain
            gainNodes = panners.map(() => new GainNode(audioCtx, { gain: 0 }));
            window.gainNodes = gainNodes;
            masterGain = new GainNode(audioCtx, { gain: 0.8 });
            
            // Create circular panner for Transition 3-4
            setupCircularPanner();
            
            // Create resonator for Strophe V
            setupResonator();
            
            // Connect everything together
            connectAudioNodes();
            
            // Set initial gains
            // MANUAL ADJUSTMENT
            setInitialSpeakerGains();
            
            console.log("Spatial audio setup complete");
            resolve();
        } catch (e) {
            console.error("Error setting up spatial audio:", e);
            
            // Create a fallback direct connection if spatial setup fails
            try {
                console.log("Creating fallback direct audio connection");
                audioSource.connect(audioCtx.destination);
                resolve();
            } catch (fallbackError) {
                reject(fallbackError);
            }
        }
    });
}

// Function to calculate hexagonal speaker positions
function getHexPosition(index, radius) {
    const speakerAngles = [210, 150, 90, 30, 330, 270];
    const angle = (speakerAngles[index] * Math.PI) / 180;
    return {
        x: radius * Math.sin(angle),
        y: posY,
        z: radius * Math.cos(angle)
    };
}

// Setup circular panner for transition 3-4
function setupCircularPanner() {
    if (!audioCtx) return;
    
    // Create a gain node to control the circular panning effect
    circularPanner = {
        angle: 0,
        speed: 0.5, // Base rotation speed
        active: false
    };
}

// Setup resonator for strophe V
function setupResonator() {
    if (!audioCtx) return;
    
    // Create a convolver node for resonance effect
    resonator = audioCtx.createConvolver();
    
    // Create a buffer for the impulse response
    const sampleRate = audioCtx.sampleRate;
    const bufferLength = 2 * sampleRate; // 2 seconds
    const buffer = audioCtx.createBuffer(2, bufferLength, sampleRate);
    
    // Generate impulse response for piano-like resonance
    for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < bufferLength; i++) {
            // Exponential decay
            data[i] = (Math.random() * 2 - 1) * Math.pow(0.5, i / (bufferLength / 50));
        }
    }
    
    // Set the buffer to the convolver
    resonator.buffer = buffer;
    
    // Create dry/wet mixer
    dryGain = audioCtx.createGain();
    wetGain = audioCtx.createGain();
    
    dryGain.gain.value = 1.0;
    wetGain.gain.value = 0.0;
}

// Connect audio nodes based on the current scene
function connectAudioNodes() {
    if (!audioSource || !audioCtx) return;
    
    // Clear existing connections
    try {
        audioSource.disconnect();
        panners.forEach(panner => panner.disconnect());
        gainNodes.forEach(gain => gain.disconnect());
        if (resonator) resonator.disconnect();
        if (dryGain) dryGain.disconnect();
        if (wetGain) wetGain.disconnect();
        if (masterGain) masterGain.disconnect();
    } catch (e) {
        // Ignore disconnect errors
    }
    
    // Basic connection for all scenes
    panners.forEach((panner, index) => {
        audioSource.connect(panner);
        panner.connect(gainNodes[index]);
        gainNodes[index].connect(masterGain);
    });
    
    // Scene-specific routing
    if (currentScene === "stropheV") {
        // Strophe V uses dry/wet mixing with resonator
        audioSource.connect(dryGain);
        dryGain.connect(masterGain);
        
        audioSource.connect(resonator);
        resonator.connect(wetGain);
        wetGain.connect(masterGain);
    }
    
    masterGain.connect(audioCtx.destination);
}

// Simplified play/pause handler
function togglePlayback() {
    // Check if audio element exists
    if (!currentAudioElement) {
        console.error("Audio element not found!");
        alert("Audio element not found. Check the HTML structure.");
        return;
    }
    
    console.log("Toggle playback called");
    
    // Initialize audio if needed
    if (!audioCtx) {
        initAudioContext().then(() => {
            actuallyTogglePlayback();
        }).catch(error => {
            console.error("Failed to initialize audio:", error);
            
            // Try direct playback as last resort
            tryDirectPlayback();
        });
    } else {
        // Resume context if needed
        if (audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => {
                actuallyTogglePlayback();
            }).catch(error => {
                console.error("Failed to resume audio context:", error);
                tryDirectPlayback();
            });
        } else {
            actuallyTogglePlayback();
        }
    }
}

// Function to actually handle play/pause state
function actuallyTogglePlayback() {
    if (playPauseButton.dataset.playing === 'false') {
        console.log("Attempting to play audio...");
        
        const playPromise = currentAudioElement.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log("Audio playback started successfully!");
                playPauseButton.dataset.playing = 'true';
                playPauseButton.style.setProperty('--play-pause-icon', '"\\23F8"');
                playPauseButton.title = "Pause Audio";
                
                if (audioInitialized) {
                    startPatternSwitching();
                    startSpecialEffects();
                }
            }).catch(error => {
                console.error("Error playing audio:", error);
                tryDirectPlayback();
            });
        }
    } else {
        console.log("Pausing audio");
        currentAudioElement.pause();
        playPauseButton.dataset.playing = 'false';
        playPauseButton.style.setProperty('--play-pause-icon', '"\\25B6"');
        playPauseButton.title = "Play Audio";
        stopPatternSwitching();
        stopSpecialEffects();
    }
}

// Last resort direct playback
function tryDirectPlayback() {
    console.log("Attempting direct playback as fallback");
    
    // Unmute and set volume explicitly
    currentAudioElement.muted = false;
    currentAudioElement.volume = 1.0;
    
    // Add inline event listeners for this attempt
    const successListener = () => {
        console.log("Direct playback successful!");
        playPauseButton.dataset.playing = 'true';
        playPauseButton.style.setProperty('--play-pause-icon', '"\\23F8"');
        currentAudioElement.removeEventListener('play', successListener);
    };
    
    const errorListener = (e) => {
        console.error("Direct playback failed:", e);
        currentAudioElement.removeEventListener('error', errorListener);
        alert("Could not play audio. Please check if the audio file exists and try again.");
    };
    
    currentAudioElement.addEventListener('play', successListener);
    currentAudioElement.addEventListener('error', errorListener);
    
    // Try to play with a slight delay
    setTimeout(() => {
        try {
            const promise = currentAudioElement.play();
            if (promise) {
                promise.catch(e => console.error("Promise rejection in direct play:", e));
            }
        } catch (e) {
            console.error("Exception in direct play:", e);
        }
    }, 300);
}

// Connect the play button to the toggle function
playPauseButton.addEventListener('click', togglePlayback);

// Reset button functionality
resetButton.addEventListener('click', () => {
    const wasPlaying = playPauseButton.dataset.playing === 'true';
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    updateArabicPlayhead(); // Reset playhead position

    playPauseButton.dataset.playing = 'false';
    playPauseButton.style.setProperty('--play-pause-icon', '"\\25B6"');
    
    currentPatternIndex = 0;
    applyPattern(currentPatternIndex);
    stopPatternSwitching();
    stopSpecialEffects();
    
    if (window.visualizer3D) {
        window.visualizer3D.resetOrientation();
    }
    
    if (wasPlaying) {
        setTimeout(() => playPauseButton.click(), 50);
    }
});

// Handle document click to initialize audio on any user interaction
document.addEventListener('click', event => {
    // Only initialize once and only for actual user clicks (not programmatic)
    if (!initializationAttempted && event.isTrusted) {
        initializationAttempted = true;
        initAudioContext().catch(e => console.error("Initialization on click failed:", e));
    }
    
    // Also try to resume the context if it exists but is suspended
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(e => console.error("Failed to resume on click:", e));
    }
});

// Set initial gain values
// MANUAL ADJUSTMENT
function setInitialSpeakerGains() {
    if (!gainNodes.length) return;
    //MANUAL ADJUSTMENT
    // const initialGains = [0.5, 0.3, 0.7, 0.4, 0.6, 0.2];
    const initialGains = [0.5, 0,0,0,0,0];
    gainNodes.forEach((gainNode, index) => {
        gainNode.gain.value = initialGains[index];
    });
    
    if (window.updateVisualization3D) {
        window.updateVisualization3D(gainNodes);
    }
}

// Function to update the position of the Arabic playhead
function updateArabicPlayhead() {
    if (!currentAudioElement || !arabicPlayhead) return;

    const duration = currentAudioElement.duration;
    const currentTime = currentAudioElement.currentTime;

    if (duration > 0) {
        const percentage = (currentTime / duration) * 100;
        arabicPlayhead.style.left = `${percentage}%`;
    } else {
        arabicPlayhead.style.left = '0%';
    }
}

// Function to handle seeking audio when clicking the visualization container
function handleSeek(event) {
    console.log("handleSeek called"); // Log entry
    if (!currentAudioElement || !arabicContainer) {
        console.log("handleSeek: Missing audio element or container");
        return;
    }
    // Check if duration is valid and available
    if (!currentAudioElement.duration || currentAudioElement.duration <= 0 || isNaN(currentAudioElement.duration)) {
        console.log("handleSeek: Audio duration not available or invalid:", currentAudioElement.duration);
        // Potentially wait for metadata if needed, or just return
        return;
    }
    // Check readyState - HAVE_METADATA (1) is minimum for duration, might need more for seeking smoothly
    if (currentAudioElement.readyState < 1) {
         console.log("handleSeek: Audio not ready for seeking. readyState:", currentAudioElement.readyState);
         // You might want to wait for 'canplay' or 'canplaythrough' event if this happens often
         return;
    }


    // Get the bounding rectangle of the container
    const rect = arabicContainer.getBoundingClientRect();

    // Calculate the click position relative to the container's left edge
    const clickX = event.clientX - rect.left;

    // Calculate the percentage position within the container
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));

    // Calculate the new time based on the percentage and duration
    const newTime = percentage * currentAudioElement.duration;

    console.log(`handleSeek: Seeking to ${newTime.toFixed(3)}s (${(percentage * 100).toFixed(1)}%)`); // Log seek details

    // Set the audio's current time
    try {
        // Ensure the new time is within valid bounds (important for some browsers/formats)
        const clampedTime = Math.max(0, Math.min(newTime, currentAudioElement.duration));
        currentAudioElement.currentTime = clampedTime;
        console.log("handleSeek: currentTime set successfully to:", clampedTime); // Log success
    } catch (e) {
        console.error("handleSeek: Error setting currentTime:", e); // Log error
        return; // Stop if setting time failed
    }


    // Immediately update the playhead position
    updateArabicPlayhead();

    // Always apply the pattern for the new time immediately after seeking
    // This ensures the visualization and audio spatialization update instantly.
    console.log("handleSeek: Applying pattern for new time", newTime); // Log pattern application
    const timestamps = timestampPatterns[currentScene].timestamps;
    let newIndex = timestamps.findIndex((timestamp, index) => {
        const nextTimestamp = timestamps[index + 1] || Infinity;
        return newTime >= timestamp && newTime < nextTimestamp;
    });
    if (newIndex === -1) newIndex = 0; // Default to first pattern if not found

    // Apply the pattern and update the current index
    currentPatternIndex = newIndex;
    applyPattern(currentPatternIndex);

    // Update 3D visualization as well
    if (window.updateVisualization3D) {
        window.updateVisualization3D(gainNodes);
    }
}

// Start pattern switching
function startPatternSwitching() {
    stopPatternSwitching();
    patternInterval = setInterval(() => {
        if (currentAudioElement.paused) return;

        // Update Arabic playhead position
        updateArabicPlayhead();

        // Special handling for Transition 3-4 (circular panning)
        if (currentScene === 'transition3-4') {
            return;  // Skip normal pattern switching, handled by circular panning
        }
        
        const currentTime = currentAudioElement.currentTime;
        const timestamps = timestampPatterns[currentScene].timestamps;
        const patterns = timestampPatterns[currentScene].patterns;
        
        let newIndex = timestamps.findIndex((timestamp, index) => {
            const nextTimestamp = timestamps[index + 1] || Infinity;
            return currentTime >= timestamp && currentTime < nextTimestamp;
        });
        
        if (newIndex === -1) newIndex = 0;
        
        if (newIndex !== currentPatternIndex) {
            currentPatternIndex = newIndex;
            applyPattern(currentPatternIndex);
        }
        
        // Special handling for StropheV (dry/wet balance)
        if (currentScene === 'stropheV' && dryGain && wetGain) {
            updateDryWetBalance(currentTime);
        }
        
        if (window.updateVisualization3D) {
            window.updateVisualization3D(gainNodes);
        }
    }, 50);
}

// Stop pattern switching
function stopPatternSwitching() {
    if (patternInterval) {
        clearInterval(patternInterval);
        patternInterval = null;
    }
}

// Start special audio effects animations
function startSpecialEffects() {
    if (animationFrameId) return;
    
    // Handle circular panning for Transition 3-4
    if (currentScene === 'transition3-4') {
        circularPanner.active = true;
        animateCircularPanning();
    }
}

// Stop special effects animations
function stopSpecialEffects() {
    circularPanner.active = false;
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// Animate circular panning for Transition 3-4
function animateCircularPanning() {
    if (!circularPanner.active) return;
    
    const currentTime = currentAudioElement ? currentAudioElement.currentTime : 0;
    const audioDuration = currentAudioElement ? currentAudioElement.duration || 10 : 10;
    
    // Calculate acceleration factor based on time
    // Start slow, gradually accelerate to maximum speed
    accelerationFactor = 1.0 + (currentTime / audioDuration) * 5.0;
    
    // Update the angle
    circularPanner.angle += (circularPanner.speed * accelerationFactor) * 0.05;
    
    // Normalize the angle
    if (circularPanner.angle > Math.PI * 2) {
        circularPanner.angle -= Math.PI * 2;
    }
    
    // Calculate gains for each speaker to create a moving sound
    if (gainNodes && gainNodes.length === 6) {
        const baseAngle = (Math.PI * 2) / 6; // Angle between speakers
        
        for (let i = 0; i < 6; i++) {
            // Calculate angle for this speaker
            const speakerAngle = i * baseAngle;
            
            // Calculate distance from current angle to speaker angle
            let angleDiff = Math.abs(circularPanner.angle - speakerAngle);
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
            
            // Convert angle difference to gain (closer angle = higher gain)
            const gain = Math.max(0, 1 - (angleDiff / (baseAngle * 1.5)));
            
            // Apply gain
            gainNodes[i].gain.setTargetAtTime(gain, audioCtx.currentTime, 0.05);
        }
    }
    
    // Update visualization if available
    if (window.updateVisualization3D) {
        window.updateVisualization3D(gainNodes);
    }
    
    // Continue animation
    animationFrameId = requestAnimationFrame(animateCircularPanning);
}

// Update dry/wet balance for Strophe V
function updateDryWetBalance(currentTime) {
    if (!dryGain || !wetGain) return;
    
    // Calculate wet/dry balance based on time
    // Start dry, gradually increase wet signal
    const audioDuration = currentAudioElement ? currentAudioElement.duration || 10 : 10;
    const wetAmount = Math.min(1.0, currentTime / (audioDuration * 0.7)); // Reach full wet at 70% of duration
    
    // Apply crossfade
    dryGain.gain.setTargetAtTime(1.0 - (wetAmount * 0.8), audioCtx.currentTime, 0.1); // Keep some dry signal
    wetGain.gain.setTargetAtTime(wetAmount, audioCtx.currentTime, 0.1);
}

// Apply a specific pattern
function applyPattern(index) {
    if (!gainNodes.length) return;
    
    const patterns = timestampPatterns[currentScene].patterns;
    if (!patterns || !patterns[index]) return;
    
    const pattern = patterns[index];
    pattern.forEach((gain, idx) => {
        if (gainNodes[idx]) {
            // If in mixing mode and not performer mode, only apply pattern if not manually set
            if (!isMixingMode || currentMode === 'performer') {
                gainNodes[idx].gain.setTargetAtTime(gain, audioCtx.currentTime, 0.1);
            }
        }
    });
}

// Function to change the mode (engineer, audience, performer)
function setMode(mode) {
    if (!['engineer', 'audience', 'performer'].includes(mode)) return;
    
    currentMode = mode;
    updateListenerPosition();
    
    // Update UI
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Show/hide performer-specific UI
    const performerDropdown = document.getElementById('performer-dropdown-container');
    if (performerDropdown) {
        performerDropdown.style.display = mode === 'performer' ? 'block' : 'none';
    }
    
    // Disable manual controls in performer mode
    if (mode === 'performer') {
        const mixModeToggle = document.querySelector('#mixModeToggle');
        if (mixModeToggle) {
            mixModeToggle.checked = false;
            isMixingMode = false;
        }
    }
    
    // Handle view swapping for different modes
    const sceneContainer = document.getElementById('scene-container');
    const topdownView = document.querySelector('.topdown-view');
    
    if (sceneContainer && topdownView) {
        // In engineer mode, make 2D view bigger and 3D view smaller
        if (mode === 'engineer') {
            sceneContainer.classList.add('minimized');
            topdownView.classList.add('expanded');
        } else {
            sceneContainer.classList.remove('minimized');
            topdownView.classList.remove('expanded');
        }
        
        // Force a resize event after a short delay to ensure proper rendering after class changes
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 50);
    }
    
    // Reset view in 3D visualization
    if (window.visualizer3D) {
        window.visualizer3D.resetOrientation();
        
        // For audience mode, move back
        if (mode === 'audience' && window.visualizer3D.moveCamera) {
            window.visualizer3D.moveCamera(0, 1.7, 2);
        } 
        // For engineer mode, position higher looking down
        else if (mode === 'engineer' && window.visualizer3D.moveCamera) {
            window.visualizer3D.moveCamera(0, 2.5, 0); // Lower height to keep things visible
        }
        // For performer mode, position at the selected speaker
        else if (mode === 'performer' && window.visualizer3D.moveToSpeakerPosition) {
            window.visualizer3D.moveToSpeakerPosition(currentPerformerSpeakerIndex);
        }
    }
    
    // Update the pattern for current time position
    if (!currentAudioElement.paused) {
        const currentTime = currentAudioElement.currentTime;
        
        const timestamps = timestampPatterns[currentScene].timestamps;
        let newIndex = timestamps.findIndex((timestamp, index) => {
            const nextTimestamp = timestamps[index + 1] || Infinity;
            return currentTime >= timestamp && currentTime < nextTimestamp;
        });
        
        if (newIndex === -1) newIndex = 0;
        applyPattern(newIndex);
    }
}

// Function to change the scene
function setScene(scene) {
    if (!['default', 'transition1-2', 'transition3-4', 'stropheV'].includes(scene)) return;
    
    // Stop any active animations
    stopPatternSwitching();
    stopSpecialEffects();
    
    currentScene = scene;
    
    // Update global variables for access from other components
    window.timestamps = timestampPatterns[scene].timestamps;
    window.presets = timestampPatterns[scene].patterns;
    
    // Update audio source
    const wasPlaying = currentAudioElement && !currentAudioElement.paused;
    
    currentAudioElement = audioElements[scene];
    window.audioElement = currentAudioElement;
    
    // Reset time position
    currentAudioElement.currentTime = 0;
    currentPatternIndex = 0;
    updateArabicPlayhead(); // Reset playhead on scene change

    // Reconnect audio nodes for the new scene
    if (audioInitialized) {
        // Create a new source for the new audio element
        if (audioSource) {
            try {
                audioSource.disconnect();
            } catch (e) {
                // Ignore disconnect errors
            }
        }
        
        try {
            audioSource = audioCtx.createMediaElementSource(currentAudioElement);
        } catch (e) {
            // If already connected, just update connections
            if (e.message && e.message.includes('already connected')) {
                console.log("Audio element already connected, updating routing");
            } else {
                console.error("Error creating media element source:", e);
            }
        }
        
        // Update audio routing
        connectAudioNodes();
        applyPattern(currentPatternIndex);
    }
    
    // Update UI
    document.querySelectorAll('.scene-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.scene === scene);
    });
    
    // Resume playback if needed
    if (wasPlaying) {
        currentAudioElement.play()
            .then(() => {
                startPatternSwitching();
                startSpecialEffects();
            })
            .catch(e => console.error("Error playing new audio scene:", e));
    }
    
    // Show trivia for the current scene
    showSceneTrivia(scene);
}

// Function to toggle mixing mode
function setMixingMode(enabled) {
    isMixingMode = enabled;
    
    // In performer mode, always disable mixing
    if (currentMode === 'performer') {
        isMixingMode = false;
    }
    
    // Update UI
    document.querySelector('#mixModeToggle').checked = isMixingMode;
    
    // If turning off mix mode, reapply current pattern
    if (!isMixingMode) {
        applyPattern(currentPatternIndex);
    }
}

// Show trivia popup with content specific to the current scene
function showSceneTrivia(scene) {
    const triviaContent = document.querySelector('.trivia-content');
    if (!triviaContent || !window.getSceneTrivia) return;
    
    const sceneTrivia = window.getSceneTrivia(scene);
    if (!sceneTrivia) return;
    
    triviaContent.innerHTML = sceneTrivia.content;
    
    // Auto-show trivia for 3 seconds when scene changes
    const triviaContainer = document.querySelector('.trivia-container');
    if (triviaContainer) {
        triviaContainer.style.display = 'flex';
        setTimeout(() => {
            triviaContainer.style.display = 'none';
        }, 3000);
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded, initializing UI...");
    
    // Set initial button states
    if (playPauseButton) {
        playPauseButton.dataset.playing = 'false';
        playPauseButton.title = "Play Audio";
    }
    
    if (resetButton) {
        resetButton.title = "Reset to Beginning";
    }
    
    // Set up mode selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setMode(btn.dataset.mode);
        });
    });
    
    // Set up performer speaker selection
    const performerSelect = document.getElementById('performer-speaker-select');
    if (performerSelect) {
        performerSelect.addEventListener('change', () => {
            currentPerformerSpeakerIndex = parseInt(performerSelect.value);
            if (currentMode === 'performer') {
                updateListenerPosition();
                if (window.visualizer3D && window.visualizer3D.moveToSpeakerPosition) {
                    window.visualizer3D.moveToSpeakerPosition(currentPerformerSpeakerIndex);
                }
            }
        });
    }
    
    // Set up scene selection
    document.querySelectorAll('.scene-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setScene(btn.dataset.scene);
        });
    });
    
    // Set up mixing mode toggle
    const mixModeToggle = document.getElementById('mixModeToggle');
    if (mixModeToggle) {
        mixModeToggle.addEventListener('change', () => {
            setMixingMode(mixModeToggle.checked);
        });
    }
    
    // Set up trivia button
    const triviaButton = document.getElementById('triviaButton');
    const triviaContainer = document.querySelector('.trivia-container');
    const closeTrivia = document.querySelector('.close-trivia');
    
    if (triviaButton && triviaContainer) {
        triviaButton.addEventListener('click', () => {
            triviaContainer.style.display = 'flex';
        });
    }
    
    if (closeTrivia && triviaContainer) {
        closeTrivia.addEventListener('click', () => {
            triviaContainer.style.display = 'none';
        });
    }
    
    // Set up trivia navigation
    document.querySelectorAll('.trivia-nav').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = btn.dataset.section;
            if (window.getTriviaContent && section) {
                const content = window.getTriviaContent(section);
                const triviaContent = document.querySelector('.trivia-content');
                if (triviaContent && content) {
                    triviaContent.innerHTML = content.content;
                    
                    document.querySelectorAll('.trivia-nav').forEach(navBtn => {
                        navBtn.classList.toggle('active', navBtn === btn);
                    });
                }
            }
        });
    });
    
    // Initialize mode and scene
    setMode('engineer');
    setScene('default');
    
    // Add click listener for seeking on the Arabic visualization
    if (arabicContainer) {
        arabicContainer.addEventListener('click', handleSeek);
    }

    // Check if audio files exist
    checkAudioFilesExist();
});

// Function to check if the audio files exist
function checkAudioFilesExist() {
    const audioIds = ['double', 'transition1-2', 'transition3-4', 'stropheV'];
    
    audioIds.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            console.error(`Audio element with ID '${id}' not found!`);
            return;
        }
        
        // Try fetch to check if file exists
        fetch(element.src, { method: 'HEAD' })
            .then(response => {
                if (response.ok) {
                    console.log(`✓ Audio file exists: ${element.src}`);
                } else {
                    console.error(`✗ Audio file not found: ${element.src}`);
                    element.dataset.fileExists = 'false';
                }
            })
            .catch(() => {
                // For CORS errors, assume file exists but is restricted
                console.log(`? Cannot verify audio file (CORS): ${element.src}`);
            });
    });
}