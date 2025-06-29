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
function setupCircularPanner() {
    if (!audioCtx) return;
    
    // Create a gain node to control the circular panning effect
    circularPanner = {
        angle: 0,
        speed: 0.5, // Base rotation speed
        active: false
    };
}

// Setup dry/wet mixing for Strophe V
function setupResonator() {
    if (!audioCtx) return;
    
    // Create dry/wet mixer gain nodes
    dryGain = audioCtx.createGain();
    wetGain = audioCtx.createGain();
    
    // Initialize with both signals playing together (50/50 mix)
    dryGain.gain.value = 0.5; // 50% dry at start
    wetGain.gain.value = 0.5; // 50% wet at start
    
    console.log("Dry/wet mixer setup complete for Strophe V");
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
        // Strophe V uses dual audio sources with dry/wet mixing
        if (stropheWetAudioSource && wetPanners.length && wetGainNodes.length) {
            // Connect dry source (main audio element) through speakers to dry gain
            panners.forEach((panner, index) => {
                audioSource.connect(panner);
                panner.connect(gainNodes[index]);
                gainNodes[index].connect(dryGain);
            });
            dryGain.connect(masterGain);
            
            // Connect wet source through separate wet panners to wet gain
            wetPanners.forEach((panner, index) => {
                stropheWetAudioSource.connect(panner);
                panner.connect(wetGainNodes[index]);
                // Copy the gain values from the dry signal
                wetGainNodes[index].gain.value = gainNodes[index].gain.value;
                wetGainNodes[index].connect(wetGain);
            });
            wetGain.connect(masterGain);
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
    pattern.forEach((gain, idx) => {
        if (gainNodes[idx]) {
            gainNodes[idx].gain.setTargetAtTime(gain, audioCtx ? audioCtx.currentTime : 0, 0.1);
            
            // For Strophe V, also update the wet gain nodes
            if (currentScene === 'stropheV' && wetGainNodes[idx]) {
                wetGainNodes[idx].gain.setTargetAtTime(gain, audioCtx ? audioCtx.currentTime : 0, 0.1);
            }
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
    const t3 = 43.600;  // Reach 100% wet
    const t4 = 69.500;  // Return to 100% dry
    
    if (currentTime < t1) {
        // 0:00 to t1: Start with both playing together, transition to 100% dry
        const progress = currentTime / t1; // 0 to 1
        automaticWetAmount = 0.5 * (1.0 - progress); // Start at 50% wet, go to 0% wet
    } else if (currentTime < t2) {
        // t1 to t2: Stay at 100% dry
        automaticWetAmount = 0.0;
    } else if (currentTime < t3) {
        // t2 to t3: Transition from 100% dry to 100% wet
        const progress = (currentTime - t2) / (t3 - t2); // 0 to 1
        automaticWetAmount = progress; // Go from 0% to 100% wet
    } else if (currentTime < t4) {
        // t3 to t4: Transition from 100% wet back to 100% dry
        const progress = (currentTime - t3) / (t4 - t3); // 0 to 1
        automaticWetAmount = 1.0 - progress; // Go from 100% wet to 0% wet
    } else {
        // After t4: Stay at 100% dry
        automaticWetAmount = 0.0;
    }
    
    // In engineer mode, use manual control instead of automatic
    let finalWetAmount = automaticWetAmount;
    if (currentMode === 'engineer') {
        finalWetAmount = manualWetAmount;
    }
    
    // Apply the crossfade
    const dryAmount = 1.0 - finalWetAmount;
    
    dryGain.gain.setTargetAtTime(dryAmount, audioCtx.currentTime, 0.05);
    wetGain.gain.setTargetAtTime(finalWetAmount, audioCtx.currentTime, 0.05);

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
        const dryAmount = 1.0 - manualWetAmount;
        dryGain.gain.setTargetAtTime(dryAmount, audioCtx.currentTime, 0.05);
        wetGain.gain.setTargetAtTime(manualWetAmount, audioCtx.currentTime, 0.05);
    }
}

// Initialize dry/wet control when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the dry/wet control visibility
    toggleDryWetControlVisibility();
    
    // Set initial dry/wet value
    setDryWetAmount(0);
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

// Add a resize listener to force view updates
window.addEventListener('resize', () => {
    // Use a timeout to avoid excessive calls during resize spam
    setTimeout(() => {
        console.log('Dispatching resize event on window resize');
        window.dispatchEvent(new Event('resize'));
    }, 100);
});