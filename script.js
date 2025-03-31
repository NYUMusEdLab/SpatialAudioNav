/**
 * Simplified Spatial Audio Implementation - Chrome Compatible Version
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

// Get the audio element first
const audioElement = document.getElementById("double");
if (!audioElement) {
    console.error("Audio element with ID 'double' not found!");
}

// Audio timestamps and patterns (unchanged)
const timestamps = [
    0, 1.483, 3.311, 4.59, 7.863, 11.365, 17.314, 18.926, 23.75, 
    31.035, 33.334, 36.547, 37.723, 40.114, 41.014, 42.203, 43.957, 
    45.172, 45.783, 47.39, 48.731, 50.323, 52.462, 55.005, 59.489, 
    63.377, 68.79
];

const presets = [
    [1, 0, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0], [0, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 0], [0, 0, 0, 0, 1, 0], [0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 1], [0, 0, 1, 0, 0, 0], [0, 0, 1, 0, 0, 1],
    [0, 1, 0, 0, 1, 0], [0, 1, 0, 1, 0, 0], [1, 0, 0, 0, 0, 1],
    [1, 1, 0, 0, 0, 0], [0, 0, 0, 1, 1, 0], [0, 0, 1, 0, 0, 1],
    [0, 1, 1, 0, 0, 0], [0, 1, 1, 1, 0, 0], [0, 1, 0, 1, 1, 0],
    [1, 1, 0, 0, 1, 0], [1, 0, 0, 0, 1, 1], [0, 0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0, 1], [1, 0, 0, 1, 0, 1], [1, 0, 1, 1, 0, 1],
    [1, 1, 1, 1, 0, 1], [1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0]
];

// Make timestamps and presets available globally
window.timestamps = timestamps;
window.presets = presets;

// Pattern switching variables
let patternInterval = null;
let currentPatternIndex = 0;

// UI Controls
const playPauseButton = document.getElementById('playPauseButton');
const resetButton = document.getElementById('resetButton');

if (!playPauseButton) console.error("Play/Pause button not found!");
if (!resetButton) console.error("Reset button not found!");

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
            
            // Set listener position and orientation
            const listener = audioCtx.listener;
            listener.positionX.value = posX;
            listener.positionY.value = posY;
            listener.positionZ.value = posZ;
            listener.forwardX.value = 0;
            listener.forwardY.value = 0;
            listener.forwardZ.value = -1;
            listener.upX.value = 0;
            listener.upY.value = 1;
            listener.upZ.value = 0;
            
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

// Function to set up all the Web Audio connections
function setupWebAudio() {
    return new Promise((resolve, reject) => {
        if (!audioCtx || !audioElement) {
            reject(new Error("Missing AudioContext or audio element"));
            return;
        }
        
        // Create audio source from element
        try {
            audioSource = audioCtx.createMediaElementSource(audioElement);
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
            
            // Connect everything together
            panners.forEach((panner, index) => {
                audioSource.connect(panner);
                panner.connect(gainNodes[index]);
                gainNodes[index].connect(masterGain);
            });
            
            masterGain.connect(audioCtx.destination);
            
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

// Simplified play/pause handler
function togglePlayback() {
    // Check if audio element exists
    if (!audioElement) {
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
        
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log("Audio playback started successfully!");
                playPauseButton.dataset.playing = 'true';
                playPauseButton.style.setProperty('--play-pause-icon', '"\\23F8"');
                playPauseButton.title = "Pause Audio";
                
                if (audioInitialized) {
                    startPatternSwitching();
                }
            }).catch(error => {
                console.error("Error playing audio:", error);
                tryDirectPlayback();
            });
        }
    } else {
        console.log("Pausing audio");
        audioElement.pause();
        playPauseButton.dataset.playing = 'false';
        playPauseButton.style.setProperty('--play-pause-icon', '"\\25B6"');
        playPauseButton.title = "Play Audio";
        stopPatternSwitching();
    }
}

// Last resort direct playback
function tryDirectPlayback() {
    console.log("Attempting direct playback as fallback");
    
    // Unmute and set volume explicitly
    audioElement.muted = false;
    audioElement.volume = 1.0;
    
    // Add inline event listeners for this attempt
    const successListener = () => {
        console.log("Direct playback successful!");
        playPauseButton.dataset.playing = 'true';
        playPauseButton.style.setProperty('--play-pause-icon', '"\\23F8"');
        audioElement.removeEventListener('play', successListener);
    };
    
    const errorListener = (e) => {
        console.error("Direct playback failed:", e);
        audioElement.removeEventListener('error', errorListener);
        alert("Could not play audio. Please check if the audio file exists and try again.");
    };
    
    audioElement.addEventListener('play', successListener);
    audioElement.addEventListener('error', errorListener);
    
    // Try to play with a slight delay
    setTimeout(() => {
        try {
            const promise = audioElement.play();
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
    audioElement.pause();
    audioElement.currentTime = 0;
    
    playPauseButton.dataset.playing = 'false';
    playPauseButton.style.setProperty('--play-pause-icon', '"\\25B6"');
    
    currentPatternIndex = 0;
    applyPattern(currentPatternIndex);
    stopPatternSwitching();
    
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
function setInitialSpeakerGains() {
    if (!gainNodes.length) return;
    
    const initialGains = [0.5, 0.3, 0.7, 0.4, 0.6, 0.2];
    gainNodes.forEach((gainNode, index) => {
        gainNode.gain.value = initialGains[index];
    });
    
    if (window.updateVisualization3D) {
        window.updateVisualization3D(gainNodes);
    }
}

// Start pattern switching
function startPatternSwitching() {
    stopPatternSwitching();
    patternInterval = setInterval(() => {
        if (audioElement.paused) return;
        
        const currentTime = audioElement.currentTime;
        
        let newIndex = timestamps.findIndex((timestamp, index) => {
            const nextTimestamp = timestamps[index + 1] || Infinity;
            return currentTime >= timestamp && currentTime < nextTimestamp;
        });
        
        if (newIndex === -1) newIndex = 0;
        
        if (newIndex !== currentPatternIndex) {
            currentPatternIndex = newIndex;
            applyPattern(currentPatternIndex);
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

// Apply a specific pattern
function applyPattern(index) {
    if (!gainNodes.length) return;
    
    const pattern = presets[index];
    pattern.forEach((gain, idx) => {
        if (gainNodes[idx]) {
            gainNodes[idx].gain.setTargetAtTime(gain, audioCtx.currentTime, 0.1);
        }
    });
}

// Add simple audio event listeners for debugging
audioElement.addEventListener('loadeddata', () => {
    console.log("Audio loaded successfully! Duration:", audioElement.duration);
});

audioElement.addEventListener('play', () => {
    console.log("Audio play event triggered");
});

audioElement.addEventListener('error', (e) => {
    console.error("Audio error event:", e);
    console.error("Audio error code:", audioElement.error ? audioElement.error.code : "No error code");
    console.error("Audio network state:", audioElement.networkState);
    alert("Error with audio playback. Check browser console for details.");
});

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
    
    // Add a super simple direct play button
    const container = document.getElementById('immersive-container');
    const directPlayButton = document.createElement('button');
    directPlayButton.textContent = "Simple Play";
    directPlayButton.style.position = "absolute";
    directPlayButton.style.left = "10px";
    directPlayButton.style.top = "10px";
    directPlayButton.style.zIndex = "1000";
    
    directPlayButton.addEventListener('click', function() {
        // Simplest possible approach
        const audio = document.getElementById("double");
        if (audio) {
            try {
                // First try to play directly
                audio.play().then(() => {
                    console.log("Simple play successful");
                }).catch(e => {
                    console.error("Simple play failed:", e);
                    
                    // If that fails, create a brand new audio element and try again
                    const newAudio = new Audio(audio.src);
                    newAudio.play().then(() => {
                        console.log("New audio element play successful");
                    }).catch(e2 => {
                        console.error("New audio element play failed too:", e2);
                    });
                });
            } catch (e) {
                console.error("Error in simple play:", e);
            }
        }
    });
    
    container.appendChild(directPlayButton);
    
    // Check if audio file exists
    checkAudioFileExists();
});

// Function to check if the audio file exists
function checkAudioFileExists() {
    if (!audioElement || !audioElement.src) {
        console.error("No audio element or source to check");
        return;
    }
    
    // Try multiple approaches to verify the file
    
    // 1. Use fetch (might fail with CORS)
    fetch(audioElement.src, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                console.log("✓ Audio file exists (fetch check):", audioElement.src);
            } else {
                console.error("✗ Audio file not found (fetch check):", audioElement.src);
                showFileErrorMessage();
            }
        })
        .catch(error => {
            console.warn("Fetch check failed (might be CORS):", error);
            
            // 2. Try a different approach - create a temporary Audio object
            const tempAudio = new Audio();
            tempAudio.addEventListener('canplaythrough', () => {
                console.log("✓ Audio file exists (canplaythrough check)");
            });
            tempAudio.addEventListener('error', () => {
                console.error("✗ Audio file not found (canplaythrough check)");
                showFileErrorMessage();
            });
            tempAudio.src = audioElement.src;
        });
}

// Show error message if the file can't be found
function showFileErrorMessage() {
    // Create a visible error message on the page
    const container = document.getElementById('immersive-container');
    const errorMsg = document.createElement('div');
    errorMsg.style.position = "absolute";
    errorMsg.style.top = "50%";
    errorMsg.style.left = "50%";
    errorMsg.style.transform = "translate(-50%, -50%)";
    errorMsg.style.background = "rgba(0,0,0,0.8)";
    errorMsg.style.color = "red";
    errorMsg.style.padding = "20px";
    errorMsg.style.borderRadius = "10px";
    errorMsg.style.zIndex = "2000";
    errorMsg.innerHTML = `
        <h2>Audio File Error</h2>
        <p>Could not load audio file from: ${audioElement.src}</p>
        <p>Make sure the file exists at the specified path.</p>
        <p>Expected location: audio/double-clarinet-si.mp3</p>
    `;
    container.appendChild(errorMsg);
}