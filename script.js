/**
 * Enhanced Spatial Audio Implementation
 * 
 * ==== TIMING DOCUMENTATION SUMMARY ====
 * 
 * This application uses HARDCODED timing values for 4 different musical movements.
 * All timing values are defined in the timestampPatterns object (lines ~70-160).
 * 
 * TIMING SOURCES:
 * 1. PRIMARY: timestampPatterns object in this file (script.js) - ACTIVELY USED
 * 2. REFERENCE: /timings/*.txt files - for development reference only, NOT used by app
 * 
 * MOVEMENT TIMING BREAKDOWN:
 * 
 * 1. DEFAULT (Double Clarinet):
 *    - 27 timing points from 0 to 68.79 seconds
 *    - Simple pattern switching between 6 speakers
 *    - Timings: timestampPatterns.default.timestamps (line ~76)
 * 
 * 2. TRANSITION 1-2:  
 *    - 25 timing points from 0 to 56.929 seconds
 *    - Special decay behavior - speakers fade to 0.5 instead of 0
 *    - Timings: timestampPatterns["transition1-2"].timestamps (line ~90)
 * 
 * 3. TRANSITION 3-4:
 *    - 5 timing points from 0 to 55.5 seconds
 *    - Uses CIRCULAR PANNING with acceleration over time
 *    - Rotation speed controlled in animateCircularPanning() (line ~1020)
 *    - Timings: timestampPatterns["transition3-4"].timestamps (line ~140)
 * 
 * 4. STROPHE V:
 *    - 10 timing points from 0 to 9 seconds (simplified for demo)
 *    - Uses DRY/WET mixing between performer and hidden speaker
 *    - Automatic crossfading controlled in updateDryWetBalance() (line ~1080)
 *    - Timings: timestampPatterns.stropheV.timestamps (line ~150)
 * 
 * TIMING CONTROL FUNCTIONS:
 * - startPatternSwitching(): Main timing loop (50ms intervals)
 * - animateCircularPanning(): Controls rotation speed for transition3-4  
 * - updateDryWetBalance(): Controls crossfading for StropheV
 * - setInitialSpeakerGains(): Sets starting conditions for each movement
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
let toggleMin3DViewBtn = null; // Declare variable for the toggle button
let currentPerformerSpeakerIndex = 0;

// Audio effects for special scenes
let circularPanner = null;
let accelerationFactor = 1.0;
let resonator = null;
let dryWetMixer = null;
let wetGain = null;
let dryGain = null;

// Strophe V specific variables
let stropheWetAudioElement = null;
let stropheWetAudioSource = null;
let wetPanners = []; // Separate panners for wet signal
let wetGainNodes = []; // Separate gain nodes for wet signal
let manualWetAmount = 0; // 0-1, controlled by engineer
let isStropheVPlaying = false;
let hiddenSpeakerPosition = null; // Position of the hidden speaker for wet signal
let performerDryPanner = null; // Panner for the performer (dry signal)
let hiddenWetPanner = null; // Panner for the hidden speaker (wet signal)

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
    
    // Get the wet audio element for Strophe V
    stropheWetAudioElement = document.getElementById('stropheV-wet');
});

// Audio timestamps and patterns - MAIN TIMING DEFINITIONS FOR ALL MOVEMENTS
const timestampPatterns = {
    default: {
        // DOUBLE CLARINET MOVEMENT TIMINGS (default scene)
        // These timestamps are HARDCODED in seconds for the double clarinet piece
        // Each timestamp corresponds to when the audio pattern should change
        // Total duration: ~68.79 seconds with 27 different timing points
        timestamps: [
            0, 1.483, 3.311, 4.59, 7.863, 11.365, 17.314, 18.926, 23.75, 
            31.035, 33.334, 36.547, 37.723, 40.114, 41.014, 42.203, 43.957, 
            45.172, 45.783, 47.39, 48.731, 50.323, 52.462, 55.005, 59.489, 
            63.377, 68.79
        ],
        // DOUBLE CLARINET MOVEMENT SPEAKER PATTERNS
        // Each pattern array corresponds to the 6 speakers in hexagonal arrangement
        // [speaker1, speaker2, speaker3, speaker4, speaker5, speaker6]
        // 1 = active, 0 = inactive for each timestamp above
        // 27 patterns total matching the 27 timestamps
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
        // TRANSITION 1-2 MOVEMENT TIMINGS
        // These timestamps are HARDCODED in seconds for the transition1-2 piece  
        // Corresponds to audio file: audio/transition12.mp3
        // Total duration: ~56.929 seconds with 25 different timing points
        // This movement has special gain behavior - speakers decay to 0.5 instead of 0
        timestamps: [
            0.000, 8.238, 8.657, 10.897, 11.442, 12.834, 13.283, 16.761, 
            17.966, 18.536, 19.240, 21.339, 22.231, 26.715, 27.833, 
            29.779, 30.296, 38.051, 38.437, 40.586, 41.628, 47.053, 
            47.710, 56.151, 56.929
        ],
        // TRANSITION 1-2 SPEAKER PATTERNS
        // Each pattern corresponds to timing above - 25 patterns total
        // Comments show which speaker number is active (1-6)
        // This movement uses special gain decay logic in applyPattern()
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
        // TRANSITION 3-4 MOVEMENT TIMINGS  
        // These timestamps are HARDCODED for the transition3-4 piece
        // Corresponds to audio file: audio/transition34.mp3
        // Only 5 timing points - this movement uses CIRCULAR PANNING effect
        // The circular rotation speed accelerates over time (see animateCircularPanning())
        timestamps: [0, 14.700, 50.00, 53.000, 55.500],
        // Special rotating pattern handled by circular panner
        // These patterns are overridden by the circular panning algorithm
        // The actual audio moves in a circle around all 6 speakers
        patterns: [
            [1, 0, 0, 0, 0, 0], [0, 1, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0],
            [0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 1],
        ]
    },
    "stropheV": {
        // STROPHE V MOVEMENT TIMINGS
        // These timestamps are HARDCODED for the Strophe V piece
        // Corresponds to audio files: audio/strophe5dry.mp3 and audio/strophe5wet.mp3
        // Simple 1-second intervals for demonstration - 10 timing points total
        // This movement uses DRY/WET MIXING with performer + hidden speaker
        timestamps: [0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0],
        // STROPHE V SPEAKER PATTERNS
        // Note: These patterns are largely decorative as the actual audio comes from:
        // - Performer position (dry signal at 100%)
        // - Hidden speaker behind speakers 1&2 (wet signal, controllable 0-100%)
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
    audience: { x: 0, y: 1.7, z: 2 }  // Back of the room
};

// Pattern switching variables
let patternInterval = null;
let currentPatternIndex = 0;

const speakerPositions = [
    
    { angle: 210, x: -6.1, y: 1.7, z: -3.5 }, // Speaker 1 (left front)
    { angle: 150, x: 6.1, y: 1.7, z: -3.5 },  // Speaker 2 (right front)
    { angle: 90, x: 7, y: 1.7, z: 0 },       // Speaker 3 (right)
    { angle: 30, x: 6.1, y: 1.7, z: 3.5 },   // Speaker 4 (right back)
    { angle: 330, x: -6.1, y: 1.7, z: 3.5 }, // Speaker 5 (left back)
    { angle: 270, x: -7, y: 1.7, z: 0 }      // Speaker 6 (left)
];

// UI Controls
const playPauseButton = document.getElementById('playPauseButton');
const resetButton = document.getElementById('resetButton');
const arabicPlayhead = document.getElementById('arabic-playhead'); // Get the new playhead element
const arabicContainer = document.getElementById('arabic-visualization-container'); // Get the container
const volumeDisplayPanel = document.getElementById('volume-display-panel');
const volumeDisplayBtn = document.getElementById('volumeDisplayBtn');
const closeVolumePanel = document.getElementById('closeVolumePanel');
const scorePanel = document.getElementById('score-panel');
const scoreImage = document.getElementById('score-image');
const scoreDisplayBtn = document.getElementById('scoreDisplayBtn');

if (!playPauseButton) console.error("Play/Pause button not found!");
if (!resetButton) console.error("Reset button not found!");
if (!arabicPlayhead) console.error("Arabic playhead element not found!");
if (!arabicContainer) console.error("Arabic visualization container not found!");
if (!scorePanel) console.error("Score panel not found!");
if (!scoreImage) console.error("Score image not found!");
if (!scoreDisplayBtn) console.error("Score display button not found!");

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
    // const position = modePositions[currentMode];
    
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

        // For Strophe V, also create the wet audio element
        if (currentScene === 'stropheV' && stropheWetAudioElement) {
            // Remove old wet element if it exists
            if (stropheWetAudioElement.parentNode) {
                stropheWetAudioElement.parentNode.removeChild(stropheWetAudioElement);
            }
            // Create a new wet audio element
            const newWetAudio = document.createElement('audio');
            newWetAudio.id = 'stropheV-wet';
            newWetAudio.src = 'audio/strophe5wet.mp3';
            newWetAudio.preload = "auto";
            newWetAudio.crossOrigin = "anonymous";
            document.body.appendChild(newWetAudio);
            stropheWetAudioElement = newWetAudio;
        }

        // Now create the MediaElementSourceNode for the new element
        try {
            audioSource = audioCtx.createMediaElementSource(currentAudioElement);
            connectedAudioElements.add(currentAudioElement);
            
            // For Strophe V, also create the wet audio source
            if (currentScene === 'stropheV' && stropheWetAudioElement) {
                stropheWetAudioSource = audioCtx.createMediaElementSource(stropheWetAudioElement);
                connectedAudioElements.add(stropheWetAudioElement);
            }
            
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
            
            // For Strophe V, create additional panners and gain nodes for wet signal
            if (currentScene === 'stropheV') {
                wetPanners = sources.map(source => {
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
                wetGainNodes = wetPanners.map(() => new GainNode(audioCtx, { gain: 0 }));
            }
            
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
// TIMING SETUP: Define base parameters for circular panning movement
function setupCircularPanner() {
    if (!audioCtx) return;
    
    // Create a gain node to control the circular panning effect
    circularPanner = {
        angle: 0,           // Starting angle (0 radians)
        speed: 0.5,         // BASE ROTATION SPEED (multiplied by acceleration in animateCircularPanning)
        active: false       // Whether circular panning is currently active
    };
}

// Setup dry/wet mixing for Strophe V
// INITIAL TIMING SETUP: Define starting balance between performer and hidden speaker
function setupResonator() {
    if (!audioCtx) return;
    
    // Create dry/wet mixer gain nodes
    dryGain = audioCtx.createGain();
    wetGain = audioCtx.createGain();
    
    // STROPHE V INITIAL TIMING VALUES:
    // Initialize with performer fully audible and wet signal at 50%
    dryGain.gain.value = 1.0; // 100% dry (performer) - always audible
    wetGain.gain.value = 0.5; // 50% wet at start - will increase over time via updateDryWetBalance()
    
    // SPATIAL POSITIONING: Create a position for the hidden speaker BEHIND speakers 1 and 2, slightly elevated
    // Speakers 1 and 2 are at: 
    // Speaker 1: { x: -6.1, y: 1.7, z: -3.5 }
    // Speaker 2: { x: 6.1, y: 1.7, z: -3.5 }
    // Hidden speaker should be further back (more negative z) and between them
    hiddenSpeakerPosition = {
        x: (speakerPositions[0].x + speakerPositions[1].x) / 2, // Between speakers 1 and 2 (x=0)
        y: 5, // Slightly elevated above speaker level
        z: -11 // Behind speakers 1 and 2 (they're at z=-3.5, so go further back)
    };
    
    console.log("Dry/wet mixer setup complete for Strophe V with performer and hidden speaker positioning");
}

// Connect audio nodes based on the current scene
function connectAudioNodes() {
    if (!audioSource || !audioCtx) return;
    
    // Clear existing connections
    try {
        audioSource.disconnect();
        if (stropheWetAudioSource) stropheWetAudioSource.disconnect();
        panners.forEach(panner => panner.disconnect());
        gainNodes.forEach(gain => gain.disconnect());
        if (wetPanners.length) wetPanners.forEach(panner => panner.disconnect());
        if (wetGainNodes.length) wetGainNodes.forEach(gain => gain.disconnect());
        if (resonator) resonator.disconnect();
        if (dryGain) dryGain.disconnect();
        if (wetGain) wetGain.disconnect();
        if (masterGain) masterGain.disconnect();
    } catch (e) {
        // Ignore disconnect errors
    }
    
    if (currentScene === "stropheV") {
        // Strophe V uses the performer as the dry source and a hidden speaker for the wet signal
        if (stropheWetAudioSource) {
            // Set up performer position panner for dry signal (always at 100%)
            const performerPanner = audioCtx.createPanner();
            performerPanner.panningModel = 'HRTF';
            performerPanner.distanceModel = 'inverse';
            performerPanner.refDistance = 1;
            performerPanner.maxDistance = 10000;
            performerPanner.rolloffFactor = 1;
            
            // Position the performer at the red circle location
            performerPanner.positionX.value = 0;
            performerPanner.positionY.value = -0.06; // Slightly below ground level like the red circle
            performerPanner.positionZ.value = -4.111; // Red circle position
            
            // Connect dry source (performer) directly to master at full volume
            audioSource.connect(performerPanner);
            performerPanner.connect(dryGain);
            dryGain.connect(masterGain);
            
            // Set up hidden speaker panner for wet signal only
            const hiddenSpeakerPanner = audioCtx.createPanner();
            hiddenSpeakerPanner.panningModel = 'HRTF';
            hiddenSpeakerPanner.distanceModel = 'inverse';
            hiddenSpeakerPanner.refDistance = 1;
            hiddenSpeakerPanner.maxDistance = 10000;
            hiddenSpeakerPanner.rolloffFactor = 1;
            
            // Position the hidden speaker between speakers 1 and 2, slightly elevated
            hiddenSpeakerPanner.positionX.value = hiddenSpeakerPosition.x;
            hiddenSpeakerPanner.positionY.value = hiddenSpeakerPosition.y;
            hiddenSpeakerPanner.positionZ.value = hiddenSpeakerPosition.z;
            
            // Connect wet source through hidden speaker panner to wet gain
            stropheWetAudioSource.connect(hiddenSpeakerPanner);
            hiddenSpeakerPanner.connect(wetGain);
            wetGain.connect(masterGain);
            
            // Store these panners for potential future adjustments
            performerDryPanner = performerPanner;
            hiddenWetPanner = hiddenSpeakerPanner;
            
            console.log("Strophe V setup: Performer (dry) and hidden speaker (wet) configuration active");
        } else {
            // Fallback to single source if wet source isn't available
            panners.forEach((panner, index) => {
                audioSource.connect(panner);
                panner.connect(gainNodes[index]);
                gainNodes[index].connect(masterGain);
            });
        }
    } else {
        // Basic connection for all other scenes
        panners.forEach((panner, index) => {
            audioSource.connect(panner);
            panner.connect(gainNodes[index]);
            gainNodes[index].connect(masterGain);
        });
    }
    
    masterGain.connect(audioCtx.destination);
}

// Abstracted function to play a pattern on speakers
function playSpeaker(pattern) {
    if (!gainNodes.length) return;
    
    // For Strophe V, we don't adjust the visible speaker gains
    // as audio comes from performer and hidden speaker only
    if (currentScene === 'stropheV') {
        // We still need to update the visualization for visual feedback
        if (window.updateVisualization3D) {
            window.updateVisualization3D(gainNodes);
            // For visualization purposes, we might want to indicate the hidden speaker position
            if (window.updateHiddenSpeakerVisualization && hiddenSpeakerPosition) {
                window.updateHiddenSpeakerVisualization(hiddenSpeakerPosition);
            }
        }
        return;
    }
    
    // For all other scenes, adjust visible speaker gains
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
        
        if (currentScene === 'stropheV' && stropheWetAudioElement) {
            // For Strophe V, synchronize both dry and wet audio
            playStropheVSynchronized();
        } else {
            // Normal single audio playback
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
        }
    } else {
        console.log("Pausing audio");
        if (currentScene === 'stropheV' && stropheWetAudioElement) {
            // Pause both dry and wet audio for Strophe V
            currentAudioElement.pause();
            stropheWetAudioElement.pause();
            isStropheVPlaying = false;
        } else {
            currentAudioElement.pause();
        }
        
        playPauseButton.dataset.playing = 'false';
        playPauseButton.style.setProperty('--play-pause-icon', '"\\25B6"');
        playPauseButton.title = "Play Audio";
        stopPatternSwitching();
        stopSpecialEffects();
    }
}

// Function to play both dry and wet audio for Strophe V in sync
function playStropheVSynchronized() {
    // Set both audio elements to the same time
    const currentTime = currentAudioElement.currentTime;
    stropheWetAudioElement.currentTime = currentTime;
    
    // Play both simultaneously
    const dryPromise = currentAudioElement.play();
    const wetPromise = stropheWetAudioElement.play();
    
    Promise.all([dryPromise, wetPromise]).then(() => {
        console.log("Strophe V synchronized playback started!");
        playPauseButton.dataset.playing = 'true';
        playPauseButton.style.setProperty('--play-pause-icon', '"\\23F8"');
        playPauseButton.title = "Pause Audio";
        isStropheVPlaying = true;
        
        if (audioInitialized) {
            startPatternSwitching();
            startSpecialEffects();
            startStropheVCrossfading();
        }
    }).catch(error => {
        console.error("Error playing Strophe V synchronized audio:", error);
        tryDirectPlayback();
    });
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
    
    // For Strophe V, also reset the wet audio element
    if (currentScene === 'stropheV' && stropheWetAudioElement) {
        stropheWetAudioElement.pause();
        stropheWetAudioElement.currentTime = 0;
        isStropheVPlaying = false;
    }
    
    updateArabicPlayhead(); // Reset playhead position

    playPauseButton.dataset.playing = 'false';
    playPauseButton.style.setProperty('--play-pause-icon', '"\\25B6"');
    
    currentPatternIndex = 0;
    applyPattern(currentPatternIndex);
    stopPatternSwitching();
    stopSpecialEffects();
    
    // Reset dry/wet control to initial state (50/50 mix for Strophe V)
    if (currentScene === 'stropheV') {
        setDryWetAmount(0.5); // Start at 50% wet (both playing)
    }
    
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
// INITIAL TIMING SETUP: Different movements start with different speaker configurations
function setInitialSpeakerGains() {
    if (!gainNodes.length) return;
    
    if (currentScene === "transition1-2") {
        // TRANSITION 1-2 INITIAL TIMING: All speakers start at 50% volume (0.5)
        // This is different from other movements - creates the baseline for decay behavior
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
        // DEFAULT/OTHER MOVEMENTS INITIAL TIMING: Only speaker 1 starts active at 50%
        // [speaker1, speaker2, speaker3, speaker4, speaker5, speaker6]
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
        
        // For Strophe V, also set the wet audio element's time
        if (currentScene === 'stropheV' && stropheWetAudioElement) {
            stropheWetAudioElement.currentTime = clampedTime;
        }
        
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

        // Update score scroll position if in engineer mode
        updateScoreScrollPosition();
        
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
// TIMING CONTROL: Circular panning speed accelerates based on audio position
function animateCircularPanning() {
    if (!circularPanner.active) return;
    
    const currentTime = currentAudioElement ? currentAudioElement.currentTime : 0;
    const audioDuration = currentAudioElement ? currentAudioElement.duration || 10 : 10;
    
    // TIMING ACCELERATION ALGORITHM FOR TRANSITION 3-4
    // Calculate acceleration factor based on time progression through the audio
    // Start slow, gradually accelerate to maximum speed (5x faster by the end)
    // This creates the effect where circular motion gets faster as the piece progresses
    accelerationFactor = 1.0 + (currentTime / audioDuration) * 5.0;
    
    // Update the angle - ROTATION SPEED CONTROLLED HERE
    // Base speed (0.5) * acceleration factor * frame rate multiplier (0.05)
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
// TIMING CONTROL: Automatic crossfading based on audio position
function updateDryWetBalance(currentTime) {
    if (!dryGain || !wetGain) return;
    
    // STROPHE V AUTOMATIC TIMING ALGORITHM  
    // Calculate wet/dry balance based on time progression through audio
    // Start dry (performer only), gradually increase wet signal (hidden speaker)
    const audioDuration = currentAudioElement ? currentAudioElement.duration || 10 : 10;
    // TIMING: Reach full wet signal at 70% through the audio duration
    const wetAmount = Math.min(1.0, currentTime / (audioDuration * 0.7)); // Reach full wet at 70% of duration
    
    // CROSSFADE TIMING: Apply the calculated balance with smooth transitions
    // Dry signal: starts at 100%, reduces to 20% (always keep some performer audible)
    dryGain.gain.setTargetAtTime(1.0 - (wetAmount * 0.8), audioCtx.currentTime, 0.1); // Keep some dry signal
    // Wet signal: starts at 0%, increases to 100% by 70% of audio duration  
    wetGain.gain.setTargetAtTime(wetAmount, audioCtx.currentTime, 0.1);
}

// Apply a specific pattern
function applyPattern(index) {
    if (!gainNodes.length) return;
    const patterns = timestampPatterns[currentScene].patterns;
    if (!patterns || !patterns[index]) return;
    const pattern = patterns[index];
    
    // Special handling for transition1-2
    if (currentScene === "transition1-2" && currentMode !== 'engineer') {
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
                // Speaker specified again while already active: toggle down to 0.5
                gainNodes[i].gain.cancelScheduledValues(audioCtx.currentTime);
                gainNodes[i].gain.setTargetAtTime(0.5, audioCtx.currentTime, 0.3);
                t12SpeakerStates[i].state = "decaying";
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

// Function to change the mode (engineer, audience)
function setMode(mode) {
    if (!['engineer', 'audience'].includes(mode)) return;
    
    const previousMode = currentMode; // Store the previous mode
    currentMode = mode;
    updateListenerPosition();
    
    console.log(`Setting mode to: ${mode}${previousMode ? ` (from ${previousMode})` : ''}`); // Debug log
    
    // Update UI
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Handle view swapping for different modes
    const sceneContainer = document.getElementById('scene-container');
    const topdownView = document.querySelector('.topdown-view');
    
    console.log('Elements found:', { 
        sceneContainer: !!sceneContainer, 
        topdownView: !!topdownView 
    });
    
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
            
            // Quick toggle effect only when switching from audience to engineer
            // if (previousMode === 'audience') {
            //     // First ensure it's visible for the quick flash
            //     sceneContainer.classList.remove('minimized-view-hidden');
                
            //     // After a brief moment, hide it again
            //     setTimeout(() => {
            //         sceneContainer.classList.add('minimized-view-hidden');
            //         if(toggleMin3DViewBtn) toggleMin3DViewBtn.textContent = 'Show 3D View';
            //     }, 300); // 300ms delay for the quick flash effect
            // } else {
                // If not switching from audience, just hide immediately
                sceneContainer.classList.add('minimized-view-hidden');
                if(toggleMin3DViewBtn) toggleMin3DViewBtn.textContent = 'Show 3D View';
            // }

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
        

            const performerDropdown = document.getElementById('performer-dropdown-container');
        if (performerDropdown) {
            performerDropdown.style.display = mode === 'audience' ? 'block' : 'none';
        }
        
        // // Disable manual controls in performer mode
        // if (mode === 'performer') {
        //     const mixModeToggle = document.querySelector('#mixModeToggle');
        //     if (mixModeToggle) {
        //         mixModeToggle.checked = false;
        //         isMixingMode = false;
        //     }
        // }
        
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
    }
    
    // Reset view in 3D visualization
    if (window.visualizer3D) {
        window.visualizer3D.resetOrientation();
        
        // For audience mode, move back
        if (mode === 'audience' && window.visualizer3D.moveCamera) {
            window.visualizer3D.moveCamera(0, 1.7, 0.5);
        } 
        
        // For engineer mode, position higher looking down
        else if (mode === 'engineer' && window.visualizer3D.moveCamera) {
            window.visualizer3D.moveCamera(0, 2.5, 0); // Lower height to keep things visible
        }
    }
    
    // Toggle dry/wet control visibility
    toggleDryWetControlVisibility();
    
    // Update score panel visibility based on mode
    updateScorePanelVisibility();
    
    // Reset engineer speaker keys when changing mode
    if (mode !== 'engineer') {
        resetEngineerSpeakerKeys();
    } else {
        // When entering engineer mode, initialize all speakers to 50% volume
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
    
    // Update score panel for the new scene if in engineer mode
    if (currentMode === 'engineer') {
        updateScoreForCurrentScene();
    }
    
    // Reset transition1-2 states when switching to it
    if (scene === "transition1-2") {
        resetT12SpeakerStates();
    }
    
    // Toggle volume display visibility based on scene
    toggleVolumeDisplayVisibility(scene);
    
    // Toggle dry/wet control visibility based on scene and mode
    toggleDryWetControlVisibility();
    
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
    
    // Update Arabic visualization image for the new scene
    updateArabicVisualizationImage();
    
    // For Strophe V, show the hidden speaker visualization
    if (scene === 'stropheV' && hiddenSpeakerPosition) {
        if (window.updateHiddenSpeakerVisualization) {
            window.updateHiddenSpeakerVisualization(hiddenSpeakerPosition);
        }
        // Also show initial wet/dry visualization
        if (window.updateWetDryVisualization) {
            window.updateWetDryVisualization(1.0, 0.5); // Performer at 100%, wet at 50%
        }
    }
    
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

    const performerSelect = document.getElementById('performer-speaker-select');
    if (performerSelect) {
        performerSelect.addEventListener('change', () => {
            const selectedValue = performerSelect.value;

            if (currentMode === 'audience') {
                if (selectedValue === "8") { // "Audience Center" selected
                    if (window.visualizer3D) {
                        window.visualizer3D.resetOrientation();
                    }
                } else if (selectedValue === "performer_perspective") { // "Performer Perspective" selected
                    if (window.visualizer3D && window.visualizer3D.moveToPerformerPerspective) {
                        window.visualizer3D.moveToPerformerPerspective();
                    }
                } else { // A specific speaker location selected
                    const speakerIndex = parseInt(selectedValue, 10);
                    if (!isNaN(speakerIndex) && window.visualizer3D && window.visualizer3D.moveToSpeakerPosition) {
                        window.visualizer3D.moveToSpeakerPosition(speakerIndex);
                    }
                }
            }
            // Note: currentPerformerSpeakerIndex is primarily for 'performer' mode logic,
            // which is not the mode where this dropdown is typically active.
            // For 'audience' mode, direct calls to visualizer3D methods handle the view changes.
        });
    }
    
    // Set up mode selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setMode(btn.dataset.mode);
        });
    });
    
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

    // Set up score display controls
    if (scoreDisplayBtn) {
        scoreDisplayBtn.addEventListener('click', () => {
            if (scorePanel) {
                const isVisible = scorePanel.style.display === 'block' && scorePanel.classList.contains('visible');
                
                if (isVisible) {
                    // Hide the score panel
                    scorePanel.classList.remove('visible');
                    setTimeout(() => {
                        scorePanel.style.display = 'none';
                    }, 300);
                    scoreDisplayBtn.classList.remove('active');
                } else {
                    // Show the score panel
                    scorePanel.style.display = 'block';
                    setTimeout(() => {
                        scorePanel.classList.add('visible');
                    }, 10);
                    scoreDisplayBtn.classList.add('active');
                    updateScoreForCurrentScene();
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

    // Score panel close button
    const closeScorePanel = document.getElementById('closeScorePanel');
    if (closeScorePanel) {
        closeScorePanel.addEventListener('click', () => {
            const scorePanel = document.getElementById('score-panel');
            const scoreDisplayBtn = document.getElementById('scoreDisplayBtn');
            
            if (scorePanel) {
                scorePanel.classList.remove('visible');
                // Hide the panel after animation completes
                setTimeout(() => {
                    scorePanel.style.display = 'none';
                }, 300);
            }
            
            if (scoreDisplayBtn) {
                scoreDisplayBtn.classList.remove('active');
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
    
    // Update Arabic visualization image for initial scene
    updateArabicVisualizationImage();
    
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
        // Build pattern: 1.0 for pressed (100%), 0.5 for not pressed (50% minimum)

        const baseVolume = currentScene === 'transition1-2' ? 0.5 : 0.0;
        
        const pattern = engineerSpeakerKeys.map(active => active ? 1.0 : baseVolume);
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
    // In engineer mode, set all speakers to 50% minimum volume
    if (currentMode === 'engineer') {
        const baseVolume = currentScene === 'transition1-2' ? 0.5 : 0.0;
        const pattern = [baseVolume, baseVolume, baseVolume, baseVolume, baseVolume, baseVolume];
        playSpeaker(pattern);
    }
}

// Function to start the automatic crossfading for Strophe V
function startStropheVCrossfading() {
    if (currentScene !== 'stropheV' || !isStropheVPlaying) return;
    
    // Start the crossfading animation
    requestAnimationFrame(updateStropheVCrossfade);
}

// Function to update the automatic crossfade based on time
function updateStropheVCrossfade() {
    if (currentScene !== 'stropheV' || !isStropheVPlaying || !currentAudioElement || !dryGain || !wetGain) return;
    
    const currentTime = currentAudioElement.currentTime;
    
    let automaticWetAmount = 0;
    
    // Timestamps from strophe5.txt (converted to seconds)
    const t1 = 4.000;   // Transition to 100% dry
    const t2 = 33.483;  // Start transition to wet
    const t3 = 43.600;  // Reach 100% wet (max wet signal)
    const t4 = 69.500;  // Return to 100% dry
    
    if (currentTime < t1) {
        // 0:00 to t1: Start with some wet, transition to no wet
        const progress = currentTime / t1; // 0 to 1
        automaticWetAmount = 0.5 * (1.0 - progress); // Start at 50% wet, go to 0% wet
    } else if (currentTime < t2) {
        // t1 to t2: No wet signal
        automaticWetAmount = 0.0;
    } else if (currentTime < t3) {
        // t2 to t3: Transition from no wet to full wet
        const progress = (currentTime - t2) / (t3 - t2); // 0 to 1
        automaticWetAmount = progress; // Go from 0% to 100% wet
    } else if (currentTime < t4) {
        // t3 to t4: Transition from full wet back to no wet
        const progress = (currentTime - t3) / (t4 - t3); // 0 to 1
        automaticWetAmount = 1.0 - progress; // Go from 100% wet to 0% wet
    } else {
        // After t4: No wet signal
        automaticWetAmount = 0.0;
    }
    
    // In engineer mode, use manual control instead of automatic
    let finalWetAmount = automaticWetAmount;
    if (currentMode === 'engineer') {
        finalWetAmount = manualWetAmount;
    }
    
    // For Strophe V revised implementation:
    // 1. Dry signal (performer) always at 100%
    // 2. Wet signal (hidden speaker) varies according to the wet amount
    
    // Performer is always at full volume
    dryGain.gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.05);
    
    // Hidden speaker's volume varies based on wet amount
    wetGain.gain.setTargetAtTime(finalWetAmount, audioCtx.currentTime, 0.05);
    
    // Update visualization if needed
    if (window.updateWetDryVisualization) {
        window.updateWetDryVisualization(1.0, finalWetAmount);
    }

    // Continue the animation
    if (isStropheVPlaying) {
        requestAnimationFrame(updateStropheVCrossfade);
    }
}

// Function to smoothly ramp between dry/wet values
function rampDryWetAmount(startValue, targetValue, duration) {
    const startTime = Date.now();
    const difference = targetValue - startValue;
    
    function updateRamp() {
        const elapsed = (Date.now() - startTime) / 1000; // Convert to seconds
        const progress = Math.min(elapsed / duration, 1); // Clamp to 1
        
        // Use smooth easing curve
        const easedProgress = progress * progress * (3 - 2 * progress); // Smooth step
        const currentValue = startValue + (difference * easedProgress);
        
        setDryWetAmount(currentValue);
        
        if (progress < 1) {
            requestAnimationFrame(updateRamp);
        }
    }
    
    requestAnimationFrame(updateRamp);
}

// Set up dry/wet control for Strophe V
const dryWetSlider = document.getElementById('dryWetSlider');
const dryWetValue = document.getElementById('dryWetValue');

if (dryWetSlider) {
    dryWetSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value) / 100; // Convert to 0-1 range
        setDryWetAmount(value);
    });
}

// Set up keyboard controls for dry/wet (numbers 0-9)
let keyboardDryWetTimeout = null;

// Handle keydown events for smooth ramping
window.addEventListener('keydown', (e) => {
    // Only handle keyboard controls in engineer mode for Strophe V
    if (currentMode !== 'engineer' || currentScene !== 'stropheV') return;
    
    // Handle number keys 0-9 for dry/wet control
    const key = e.key;
    if (key >= '0' && key <= '9') {
        e.preventDefault();
        const targetValue = parseInt(key) / 9; // Convert 0-9 to 0.0-1.0 range
        
        // Clear any existing timeout
        if (keyboardDryWetTimeout) {
            clearTimeout(keyboardDryWetTimeout);
        }
        
        // Smooth ramp to the new value
        rampDryWetAmount(manualWetAmount, targetValue, 0.3); // 300ms ramp
    }
});

// Function to manually ramp the dry/wet amount
function rampDryWetAmount(from, to, duration) {
    if (!dryGain || !wetGain) return;
    
    const startTime = audioCtx.currentTime;
    const endTime = startTime + duration;
    
    // Linear ramp for dry/wet amount
    dryGain.gain.setValueAtTime(from, startTime);
    dryGain.gain.linearRampToValueAtTime(1.0 - to, endTime);
    
    wetGain.gain.setValueAtTime(to, startTime);
    wetGain.gain.linearRampToValueAtTime(to, endTime);
}

// Function to set the dry/wet amount directly
function setDryWetAmount(amount) {
    manualWetAmount = Math.max(0, Math.min(1, amount)); // Clamp between 0 and 1
    
    // Update the UI
    const slider = document.getElementById('dryWetSlider');
    const valueDisplay = document.getElementById('dryWetValue');
    
    if (slider) {
        slider.value = manualWetAmount * 100;
    }
    
    if (valueDisplay) {
        valueDisplay.textContent = Math.round(manualWetAmount * 100) + '%';
    }
    
    // If in engineer mode and Strophe V is playing, immediately apply the change
    if (currentMode === 'engineer' && currentScene === 'stropheV' && isStropheVPlaying && dryGain && wetGain) {
        // For revised implementation: performer always at 100%, only wet signal varies
        dryGain.gain.setTargetAtTime(1.0, audioCtx.currentTime, 0.05);
        wetGain.gain.setTargetAtTime(manualWetAmount, audioCtx.currentTime, 0.05);
        
        // Update visualization if available
        if (window.updateWetDryVisualization) {
            window.updateWetDryVisualization(1.0, manualWetAmount);
        }
    }
}

// Initialize dry/wet control when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the dry/wet control visibility
    toggleDryWetControlVisibility();
    
    // Set initial dry/wet value
    setDryWetAmount(0);
    
    // Initialize score panel visibility
    updateScorePanelVisibility();
});

// Function to show/hide the dry/wet control based on scene and mode
function toggleDryWetControlVisibility() {
    const dryWetControl = document.getElementById('dryWetControl');
    if (!dryWetControl) return;
    
    const shouldShow = currentScene === 'stropheV' && currentMode === 'engineer';
    dryWetControl.style.display = shouldShow ? 'block' : 'none';
}

// Function to update the Arabic visualization image based on current scene
function updateArabicVisualizationImage() {
    const arabicImage = document.getElementById('arabic-visualization-image');
    if (!arabicImage) return;
    
    // Define image paths for different scenes
    const sceneImages = {
        'transition1-2': 'images/transition1-2viz.png',
        'transition3-4': 'images/transition3-4viz.png',
        'default': 'images/ArabicVisualization.png',
        'stropheV': 'images/strophe5viz.png'
    };
    
    // Get the appropriate image for the current scene
    const imagePath = sceneImages[currentScene] || sceneImages['default'];
    
    // Update the image source
    arabicImage.src = imagePath;
    
    // Update alt text to reflect the current scene
    arabicImage.alt = `${currentScene} visualization`;
}

/**
 * Score Panel Management for Audio Engineer Mode
 */

// Function to show/hide score panel based on mode
function updateScorePanelVisibility() {
    const scorePanel = document.getElementById('score-panel');
    const scoreDisplayBtn = document.getElementById('scoreDisplayBtn');
    
    if (!scorePanel) return;
    
    if (currentMode === 'engineer') {
        // Show the toggle button
        if (scoreDisplayBtn) {
            scoreDisplayBtn.style.display = 'block';
            scoreDisplayBtn.classList.add('active');
        }
        
        scorePanel.style.display = 'block';
        // Add a small delay to ensure the element is visible before animating
        setTimeout(() => {
            scorePanel.classList.add('visible');
        }, 10);
        updateScoreForCurrentScene();
    } else {
        // Hide the toggle button
        if (scoreDisplayBtn) {
            scoreDisplayBtn.style.display = 'none';
            scoreDisplayBtn.classList.remove('active');
        }
        
        scorePanel.classList.remove('visible');
        // Hide the panel after animation completes
        setTimeout(() => {
            scorePanel.style.display = 'none';
        }, 300);
    }
}

// Function to update the score image based on current scene
function updateScoreForCurrentScene() {
    const scoreImage = document.getElementById('score-image');
    if (!scoreImage) return;
    
    // Define score image paths for different scenes
    const sceneScores = {
        'default': 'images/score/boulezscoreportraitsigleinitial.png',
        'transition1-2': 'images/score/transition12.png',
        'transition3-4': 'images/score/boulezdialoguescoretransition3-4.png',
        'stropheV': 'images/score/strophe5.png'
    };
    
    // Get the appropriate score for the current scene
    const scorePath = sceneScores[currentScene] || sceneScores['default'];
    
    // Update the score image source
    scoreImage.src = scorePath;
    scoreImage.alt = `Musical score for ${currentScene}`;
    
    // Scroll to top when score changes
    const scoreContent = document.querySelector('.score-content');
    if (scoreContent) {
        scoreContent.scrollTop = 0;
    }
}

// Function to auto-scroll score based on audio progress (optional enhancement)
function updateScoreScrollPosition() {
    if (currentMode !== 'engineer' || !currentAudioElement) return;
    
    const scoreContent = document.querySelector('.score-content');
    const scoreImage = document.getElementById('score-image');
    
    if (!scoreContent || !scoreImage) return;
    
    // Only auto-scroll if audio is playing
    if (currentAudioElement.paused) return;
    
    const currentTime = currentAudioElement.currentTime;
    const duration = currentAudioElement.duration;
    
    if (duration && duration > 0) {
        // Calculate progress as a percentage
        const progress = currentTime / duration;
        
        // Calculate the scroll position (scroll through the score based on time)
        const maxScroll = scoreContent.scrollHeight - scoreContent.clientHeight;
        const targetScroll = progress * maxScroll;
        
        // Smooth scroll to the target position
        scoreContent.scrollTo({
            top: targetScroll,
            behavior: 'smooth'
        });
    }
}

// Add a resize listener to force view updates
window.addEventListener('resize', () => {
    // Use a timeout to avoid excessive calls during resize spam
    setTimeout(() => {
        console.log('Dispatching resize event on window resize');
        window.dispatchEvent(new Event('resize'));
    }, 100);
});