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
let toggleMin3DViewBtn = null; // Declare variable for the toggle button

// Audio effects for special scenes
let circularPanner = null;
let accelerationFactor = 1.0;
let resonator = null;
let dryWetMixer = null;
let wetGain = null;
let dryGain = null;

// Track which audio elements have already been connected to sources
let connectedAudioElements = new Set();

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
        timestamps: [
            0.000, 8.238, 8.657, 10.897, 11.442, 12.834, 13.283, 16.761, 
            17.966, 18.536, 19.240, 21.339, 22.231, 26.715, 27.833, 
            29.779, 30.296, 38.051, 38.437, 40.586, 41.628, 47.053, 
            47.710, 56.151, 56.929
        ],
        patterns: [
            [1, 1, 1, 1, 1, 1], // all
            [0, 0, 0, 0, 0, 1], // 6
            [0, 0, 0, 0, 0, 1], // 6
            [0, 0, 0, 0, 1, 0], // 5
            [0, 0, 0, 0, 1, 0], // 5
            [0, 1, 0, 0, 0, 0], // 2
            [0, 1, 0, 0, 0, 0], // 2
            [0, 0, 1, 0, 0, 0], // 3
            [0, 0, 1, 0, 0, 0], // 3
            [0, 0, 0, 1, 0, 0], // 4
            [0, 0, 0, 1, 0, 0], // 4
            [1, 0, 0, 0, 0, 0], // 1
            [1, 0, 0, 0, 0, 0], // 1
            [0, 1, 0, 0, 0, 0], // 2
            [0, 1, 0, 0, 0, 0], // 2
            [1, 0, 0, 0, 0, 0], // 1
            [1, 0, 0, 0, 0, 0], // 1
            [0, 0, 1, 0, 0, 0], // 3
            [0, 0, 1, 0, 0, 0], // 3
            [0, 0, 0, 0, 1, 0], // 5
            [0, 0, 0, 0, 1, 0], // 5
            [0, 0, 0, 0, 0, 1], // 6
            [0, 0, 0, 0, 0, 1], // 6
            [0, 0, 0, 1, 0, 0], // 4
            [0, 0, 0, 1, 0, 0]  // 4
        ]
    },
    "transition3-4": {
        timestamps: [0, 14.700, 50.00, 53.000, 55.500],
        // Special rotating pattern handled by circular panner
        patterns: [
            [1, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0],
            [0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 1],
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
const volumeDisplayPanel = document.getElementById('volume-display-panel');
const volumeDisplayBtn = document.getElementById('volumeDisplayBtn');
const closeVolumePanel = document.getElementById('closeVolumePanel');

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

        // --- FIX: Always create a fresh <audio> element for the current scene ---
        // This avoids the "already connected" error by ensuring a new HTMLMediaElement each time.
        // Remove the old element from DOM if it exists
        if (currentAudioElement && currentAudioElement.parentNode) {
            currentAudioElement.parentNode.removeChild(currentAudioElement);
        }
        // Create a new audio element with the same src as the scene's audio
        const newAudio = document.createElement('audio');
        newAudio.id = currentScene;
        newAudio.src = audioElements[currentScene].src;
        newAudio.preload = "auto";
        newAudio.crossOrigin = "anonymous";
        // Insert the new audio element into the DOM (so MediaElementSource works)
        document.body.appendChild(newAudio);
        // Update references
        audioElements[currentScene] = newAudio;
        currentAudioElement = newAudio;
        window.audioElement = currentAudioElement;

        // Now create the MediaElementSourceNode for the new element
        try {
            audioSource = audioCtx.createMediaElementSource(currentAudioElement);
            connectedAudioElements.add(currentAudioElement);
            
            // Continue with the rest of the setup
            createAudioGraph().then(resolve).catch(reject);
        } catch (e) {
            console.error("Error creating media element source:", e);
            reject(e);
            return;
        }
    });
}

// Function to create the audio graph (extracted from setupWebAudio for clarity)
function createAudioGraph() {
    return new Promise((resolve, reject) => {
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

// Abstracted function to play a pattern on speakers
function playSpeaker(pattern) {
    if (!gainNodes.length) return;
    pattern.forEach((gain, idx) => {
        if (gainNodes[idx]) {
            gainNodes[idx].gain.setTargetAtTime(gain, audioCtx ? audioCtx.currentTime : 0, 0.1);
        }
    });
    // Update 3D visualization if available
    if (window.updateVisualization3D) {
        window.updateVisualization3D(gainNodes);
    }
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

// Track speaker states for transition1-2
let t12SpeakerStates = null; // null or array of { state: "idle"|"active"|"decaying" }

function resetT12SpeakerStates() {
    t12SpeakerStates = Array(6).fill().map(() => ({ state: "idle" }));
}

// Set initial gain values
// MANUAL ADJUSTMENT
function setInitialSpeakerGains() {
    if (!gainNodes.length) return;
    
    if (currentScene === "transition1-2") {
        // All speakers start at 0.5 for transition1-2
        const initialGains = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
        gainNodes.forEach((gain, idx) => {
            gain.gain.setValueAtTime(initialGains[idx], audioCtx.currentTime);
        });
        resetT12SpeakerStates();
        // Update 3D visualization if available
        if (window.updateVisualization3D) {
            window.updateVisualization3D(gainNodes);
        }
    } else {
        //MANUAL ADJUSTMENT
        // const initialGains = [0.5, 0.3, 0.7, 0.4, 0.6, 0.2];
        const initialGains = [0.5, 0,0,0,0,0];
        playSpeaker(initialGains);
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
    playSpeaker(timestampPatterns[currentScene].patterns[newIndex]);

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
        
        // Update volume display for transition1-2
        if (currentScene === "transition1-2") {
            updateVolumeDisplay();
        }

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
    if (circularPanner) {
        circularPanner.active = false;
    }
    
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
    
    // Special handling for transition1-2
    if (currentScene === "transition1-2") {
        // Initialize state if needed
        if (!t12SpeakerStates || t12SpeakerStates.length !== 6) {
            resetT12SpeakerStates();
        }

        // For each speaker, determine state transitions
        for (let i = 0; i < 6; i++) {
            const isActive = !!pattern[i];
            const prevState = t12SpeakerStates[i].state;

            if (isActive && prevState === "idle") {
                // First activation: ramp up to 1.0
                gainNodes[i].gain.cancelScheduledValues(audioCtx.currentTime);
                gainNodes[i].gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.1);
                t12SpeakerStates[i].state = "active";
            } else if (!isActive && prevState === "active") {
                // Deactivation: decay to 0.5
                gainNodes[i].gain.cancelScheduledValues(audioCtx.currentTime);
                gainNodes[i].gain.setTargetAtTime(0.5, audioCtx.currentTime, 0.3);
                t12SpeakerStates[i].state = "decaying";
            } else if (!isActive && (prevState === "idle" || prevState === "decaying")) {
                // Stay at 0.5
                gainNodes[i].gain.cancelScheduledValues(audioCtx.currentTime);
                gainNodes[i].gain.setTargetAtTime(0.5, audioCtx.currentTime, 0.05);
                t12SpeakerStates[i].state = "idle";
            } else if (isActive && prevState === "active") {
                // Still active, keep at 1.0
                gainNodes[i].gain.cancelScheduledValues(audioCtx.currentTime);
                gainNodes[i].gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.05);
            } else if (isActive && prevState === "decaying") {
                // Reactivation from decaying state: ramp back up to 1.0
                gainNodes[i].gain.cancelScheduledValues(audioCtx.currentTime);
                gainNodes[i].gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.1);
                t12SpeakerStates[i].state = "active";
            }
        }
        
        // Update volume display for transition1-2
        updateVolumeDisplay();
        
        // Update 3D visualization if available
        if (window.updateVisualization3D) {
            window.updateVisualization3D(gainNodes);
        }
        return;
    }
    
    // Only apply pattern if NOT in engineer mode
    if (currentMode !== 'engineer') {
        // If in mixing mode and not performer mode, only apply pattern if not manually set
        if (!isMixingMode || currentMode === 'performer') {
            playSpeaker(pattern);
        }
    }
}

// Function to update volume display panel
function updateVolumeDisplay() {
    if (!volumeDisplayPanel || currentScene !== "transition1-2") return;
    
    if (!gainNodes || gainNodes.length < 6) return;
    
    for (let i = 0; i < 6; i++) {
        const volumeGroup = document.querySelector(`.volume-bar-group[data-speaker="${i}"]`);
        if (!volumeGroup) continue;
        
        const volumeFill = volumeGroup.querySelector('.volume-fill');
        const volumePercentage = volumeGroup.querySelector('.volume-percentage');
        
        if (!volumeFill || !volumePercentage) continue;
        
        const gain = gainNodes[i].gain.value;
        const percentage = Math.round(gain * 100);
        
        // Update the height of the volume bar
        volumeFill.style.height = `${percentage}%`;
        
        // Update the percentage text
        volumePercentage.textContent = `${percentage}%`;
        
        // Update active state for visual feedback
        volumeGroup.setAttribute('data-active', gain > 0.6 ? 'true' : 'false');
    }
}

// Function to show/hide volume display controls based on scene
function toggleVolumeDisplayVisibility(scene) {
    const shouldShow = scene === "transition1-2";
    
    if (volumeDisplayBtn) {
        volumeDisplayBtn.style.display = shouldShow ? 'block' : 'none';
    }
    
    // Auto-hide panel when switching away from transition1-2
    if (!shouldShow && volumeDisplayPanel) {
        volumeDisplayPanel.style.display = 'none';
        if (volumeDisplayBtn) {
            volumeDisplayBtn.classList.remove('active');
        }
    }
}

// Function to change the mode (engineer, audience, performer)
function setMode(mode) {
    if (!['engineer', 'audience', 'performer'].includes(mode)) return;
    
    currentMode = mode;
    updateListenerPosition();
    
    console.log(`Setting mode to: ${mode}`); // Debug log
    
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
    
    console.log('Elements found:', { 
        sceneContainer: !!sceneContainer, 
        topdownView: !!topdownView 
    }); // Debug log
    
    if (sceneContainer && topdownView) {
        // In engineer mode, make 2D view bigger and 3D view smaller
        if (mode === 'engineer') {
            console.log('Adding minimized/expanded classes');
            sceneContainer.classList.add('minimized');
            topdownView.classList.add('expanded');
            if (toggleMin3DViewBtn) toggleMin3DViewBtn.style.display = 'block';
            if (window.visualizer3D && window.visualizer3D.setEngineerViewOptimizedForMinimized) {
                window.visualizer3D.setEngineerViewOptimizedForMinimized(true);
            }
            // Ensure 3D view is visible by default when switching to engineer mode
            sceneContainer.classList.remove('minimized-view-hidden');
            if(toggleMin3DViewBtn) toggleMin3DViewBtn.textContent = 'Hide 3D View';

        } else {
            console.log('Removing minimized/expanded classes');
            sceneContainer.classList.remove('minimized');
            topdownView.classList.remove('expanded');
            if (toggleMin3DViewBtn) toggleMin3DViewBtn.style.display = 'none';
            // Ensure 3D view is visible when leaving engineer mode & reset its specific camera adjustments
            sceneContainer.classList.remove('minimized-view-hidden');
            if (window.visualizer3D && window.visualizer3D.setEngineerViewOptimizedForMinimized) {
                window.visualizer3D.setEngineerViewOptimizedForMinimized(false);
            }
        }
        
        // Log the current classes for verification
        console.log('Current classes:', {
            sceneContainer: sceneContainer.className,
            topdownView: topdownView.className
        });
        
        // Force a resize event after a short delay to ensure proper rendering after class changes
        setTimeout(() => {
            console.log('Dispatching resize event'); // Debug log
            window.dispatchEvent(new Event('resize'));
        }, 50);
    } else {
        console.error('Could not find necessary elements for view switching'); // Error log if elements missing
    }
    
    // Reset view in 3D visualization
    if (window.visualizer3D) {
        window.visualizer3D.resetOrientation();
        
        // For audience mode, move back
        if (mode === 'audience' && window.visualizer3D.moveCamera) {
            window.visualizer3D.moveCamera(0, 1.7, 0.5);
        } 
        // if (mode === 'audience' && window.visualizer3D.moveCamera) {
        //     window.visualizer3D.moveCamera(0, 1.7, 2);
        // } 
        
        // For engineer mode, position higher looking down
        else if (mode === 'engineer' && window.visualizer3D.moveCamera) {
            window.visualizer3D.moveCamera(0, 2.5, 0); // Lower height to keep things visible
        }
        // For performer mode, position at the selected speaker
        else if (mode === 'performer' && window.visualizer3D.moveToSpeakerPosition) {
            window.visualizer3D.moveToSpeakerPosition(currentPerformerSpeakerIndex);
        }
    }
    
    // Reset engineer speaker keys when changing mode
    if (mode !== 'engineer') {
        resetEngineerSpeakerKeys();
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
    
    // Always pause current audio
    if (currentAudioElement) {
        currentAudioElement.pause();
    }
    
    // Update scene 
    currentScene = scene;
    
    // Reset transition1-2 states when switching to it
    if (scene === "transition1-2") {
        resetT12SpeakerStates();
    }
    
    // Toggle volume display visibility based on scene
    toggleVolumeDisplayVisibility(scene);
    
    // Update global variables for access from other components
    window.timestamps = timestampPatterns[scene].timestamps;
    window.presets = timestampPatterns[scene].patterns;
    
    // Remember if we were playing
    const wasPlaying = playPauseButton.dataset.playing === 'true';
    
    // Reset UI state
    playPauseButton.dataset.playing = 'false';
    playPauseButton.style.setProperty('--play-pause-icon', '"\\25B6"');
    playPauseButton.title = "Play Audio";
    
    // Update to new audio element
    currentAudioElement = audioElements[scene];
    window.audioElement = currentAudioElement;
    
    // Always reset time position
    currentAudioElement.currentTime = 0;
    currentPatternIndex = 0;
    updateArabicPlayhead();
    
    // If audio was initialized, need to recreate the audio context
    if (audioInitialized) {
        // Close existing audio context
        if (audioCtx) {
            // Disconnect all audio nodes
            if (audioSource) {
                try { audioSource.disconnect(); } catch (e) {}
            }
            
            panners.forEach(panner => {
                try { panner.disconnect(); } catch (e) {}
            });
            
            gainNodes.forEach(gain => {
                try { gain.disconnect(); } catch (e) {}
            });
            
            if (masterGain) {
                try { masterGain.disconnect(); } catch (e) {}
            }
            
            // Close the audio context - this will clean up all resources
            audioCtx.close().then(() => {
                console.log("Audio context closed successfully");
                
                // Create a new audio context
                audioCtx = new AudioContext({ latencyHint: 'interactive' });
                window.audioCtx = audioCtx;
                window.listener = audioCtx.listener;
                
                // Reset our tracking of connected elements
                connectedAudioElements.clear();
                
                // Set up the audio system from scratch
                setupWebAudio().then(() => {
                    // Update UI to show the correct scene
                    document.querySelectorAll('.scene-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.scene === scene);
                    });
                    
                    // If we were playing before, start playing the new scene
                    if (wasPlaying) {
                        setTimeout(() => {
                            togglePlayback();
                        }, 100);
                    }
                });
            }).catch(e => {
                console.error("Error closing audio context:", e);
                
                // Even if closing fails, continue with UI updates
                document.querySelectorAll('.scene-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.scene === scene);
                });
            });
        }
    } else {
        // Just update UI if audio not initialized
        document.querySelectorAll('.scene-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.scene === scene);
        });
    }
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
            // Check if it's still displayed before hiding, to avoid issues if user closed it manually
            if (triviaContainer.style.display === 'flex') {
                triviaContainer.style.display = 'none';
            }
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

    // Arabic visualization toggle
    const toggleArabicBtn = document.getElementById('toggleArabicBtn');
    const arabicContainer = document.getElementById('arabic-visualization-container');
    
    if (toggleArabicBtn && arabicContainer) {
        // Initial state: If arabicContainer starts with display:none (as set in HTML),
        // the button should not have the 'active' class (which it doesn't by default in HTML).
        // The existing click listener logic will correctly add/remove 'active' class.
        
        toggleArabicBtn.addEventListener('click', function() {
            if (arabicContainer.style.display === 'none') {
                arabicContainer.style.display = 'block';
                toggleArabicBtn.classList.add('active');
            } else {
                arabicContainer.style.display = 'none';
                toggleArabicBtn.classList.remove('active');
            }
        });
    } else {
        if (!toggleArabicBtn) {
            console.error("Error: toggleArabicBtn element not found. The button might not be interactive or styled as expected.");
        }
        if (!arabicContainer) {
            console.error("Error: arabic-visualization-container element not found. Toggle functionality will be broken.");
        }
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
    
    // Set up volume display controls
    if (volumeDisplayBtn) {
        volumeDisplayBtn.addEventListener('click', () => {
            if (volumeDisplayPanel) {
                const isVisible = volumeDisplayPanel.style.display === 'block';
                volumeDisplayPanel.style.display = isVisible ? 'none' : 'block';
                volumeDisplayBtn.classList.toggle('active', !isVisible);
                
                if (!isVisible) {
                    updateVolumeDisplay(); // Update display when showing
                }
            }
        });
    }
    
    if (closeVolumePanel) {
        closeVolumePanel.addEventListener('click', () => {
            if (volumeDisplayPanel) {
                volumeDisplayPanel.style.display = 'none';
            }
            if (volumeDisplayBtn) {
                volumeDisplayBtn.classList.remove('active');
            }
        });
    }

    // Create and setup toggle button for minimized 3D view
    toggleMin3DViewBtn = document.createElement('button');
    toggleMin3DViewBtn.id = 'toggleMin3DViewBtn';
    toggleMin3DViewBtn.textContent = 'Hide 3D View';
    toggleMin3DViewBtn.style.display = 'none'; // Initially hidden
    toggleMin3DViewBtn.classList.add('minimized-view-toggle-btn');

    const immersiveContainer = document.getElementById('immersive-container');
    if (immersiveContainer) {
        immersiveContainer.appendChild(toggleMin3DViewBtn);
    }

    toggleMin3DViewBtn.addEventListener('click', () => {
        const sceneContainer = document.getElementById('scene-container');
        if (sceneContainer.classList.contains('minimized-view-hidden')) {
            sceneContainer.classList.remove('minimized-view-hidden');
            toggleMin3DViewBtn.textContent = 'Hide 3D View';
            // Crucial: Dispatch resize for Three.js to re-render correctly in the now visible container
            setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        } else {
            sceneContainer.classList.add('minimized-view-hidden');
            toggleMin3DViewBtn.textContent = 'Show 3D View';
        }
    });
    
    // Initialize mode and scene
    setMode('audience');
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

// Track which speaker keys are currently held down (engineer mode)
let engineerSpeakerKeys = [false, false, false, false, false, false];

// Map keys to speaker indices for engineer mode
const engineerKeyToSpeakerIndex = {
    '1': 0, 'u': 0,
    '2': 1, 'i': 1,
    '3': 2, 'k': 2,
    '4': 3, 'm': 3,
    '5': 4, 'n': 4,
    '6': 5, 'h': 5
};

// Engineer mode: handle keydown/keyup for speakers 1-6 and U/I/K/M/N/H
function handleEngineerSpeakerKeys(e, isDown) {
    if (currentMode !== 'engineer') return;
    const key = e.key.toLowerCase();
    if (engineerKeyToSpeakerIndex.hasOwnProperty(key)) {
        const idx = engineerKeyToSpeakerIndex[key];
        engineerSpeakerKeys[idx] = isDown;
        // Build pattern: 1 for pressed, 0 for not pressed
        const pattern = engineerSpeakerKeys.map(active => active ? 1 : 0);
        playSpeaker(pattern);
        // Prevent default to avoid unwanted browser shortcuts
        e.preventDefault();
    }
}

// Listen for keydown/keyup globally
window.addEventListener('keydown', (e) => handleEngineerSpeakerKeys(e, true));
window.addEventListener('keyup', (e) => handleEngineerSpeakerKeys(e, false));

// When leaving engineer mode, reset speaker keys and pattern
function resetEngineerSpeakerKeys() {
    engineerSpeakerKeys = [false, false, false, false, false, false];
}

// // Function to change the mode (engineer, audience, performer)
// function setMode(mode) {
//     if (!['engineer', 'audience', 'performer'].includes(mode)) return;
    
//     currentMode = mode;
//     updateListenerPosition();
    
//     // Update UI
//     document.querySelectorAll('.mode-btn').forEach(btn => {
//         btn.classList.toggle('active', btn.dataset.mode === mode);
//     });
    
//     // Show/hide performer-specific UI
//     const performerDropdown = document.getElementById('performer-dropdown-container');
//     if (performerDropdown) {
//         performerDropdown.style.display = mode === 'performer' ? 'block' : 'none';
//     }
    
//     // Disable manual controls in performer mode
//     if (mode === 'performer') {
//         const mixModeToggle = document.querySelector('#mixModeToggle');
//         if (mixModeToggle) {
//             mixModeToggle.checked = false;
//             isMixingMode = false;
//         }
//     }
    
//     // Handle view swapping for different modes
//     const sceneContainer = document.getElementById('scene-container');
//     const topdownView = document.querySelector('.topdown-view');
    
//     if (sceneContainer && topdownView) {
//         // In engineer mode, make 2D view bigger and 3D view smaller
//         if (mode === 'engineer') {
//             sceneContainer.classList.add('minimized');
//             topdownView.classList.add('expanded');
//         } else {
//             sceneContainer.classList.remove('minimized');
//             topdownView.classList.remove('expanded');
//         }
        
//         // Force a resize event after a short delay to ensure proper rendering after class changes
//         setTimeout(() => {
//             window.dispatchEvent(new Event('resize'));
//         }, 50);
//     }
    
//     // Reset view in 3D visualization
//     if (window.visualizer3D) {
//         window.visualizer3D.resetOrientation();
        
//         // For audience mode, move back
//         if (mode === 'audience' && window.visualizer3D.moveCamera) {
//             window.visualizer3D.moveCamera(0, 1.7, 0.5);
//         } 
//         // if (mode === 'audience' && window.visualizer3D.moveCamera) {
//         //     window.visualizer3D.moveCamera(0, 1.7, 2);
//         // } 
        
//         // For engineer mode, position higher looking down
//         else if (mode === 'engineer' && window.visualizer3D.moveCamera) {
//             window.visualizer3D.moveCamera(0, 2.5, 0); // Lower height to keep things visible
//         }
//         // For performer mode, position at the selected speaker
//         else if (mode === 'performer' && window.visualizer3D.moveToSpeakerPosition) {
//             window.visualizer3D.moveToSpeakerPosition(currentPerformerSpeakerIndex);
//         }
//     }
    
//     // Reset engineer speaker keys when changing mode
//     if (mode !== 'engineer') {
//         resetEngineerSpeakerKeys();
//     }
    
//     // Update the pattern for current time position
//     if (!currentAudioElement.paused) {
//         const currentTime = currentAudioElement.currentTime;
        
//         const timestamps = timestampPatterns[currentScene].timestamps;
//         let newIndex = timestamps.findIndex((timestamp, index) => {
//             const nextTimestamp = timestamps[index + 1] || Infinity;
//             return currentTime >= timestamp && currentTime < nextTimestamp;
//         });
        
//         if (newIndex === -1) newIndex = 0;
//         applyPattern(newIndex);
//     }
// }