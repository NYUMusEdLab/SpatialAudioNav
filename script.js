import OverviewTimeline from './js/OverviewTimeline.js';
import KeywordPanel from './js/KeywordPanel.js';
import SynthesiaDisplay from './js/Synthesia.js';

/**
 * Minimal Spatial Audio Implementation
 * Controls 6 audio sources in a hexagonal arrangement
 */

/*--------------------Web Audio Environment Setup--------------------*/
// Create audio context and listener
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext({ latencyHint: 'interactive' });
const listener = audioCtx.listener;

// Make them globally accessible for the 3D visualizer
window.audioCtx = audioCtx;
window.listener = listener;

// Configure the audio context for spatial audio
audioCtx.destination.channelCount = audioCtx.destination.maxChannelCount;
audioCtx.destination.channelCountMode = "explicit";
audioCtx.destination.channelInterpretation = "speakers";

// Constants for panner properties
const innerCone = 30;
const outerCone = 60;
const outerGain = 0.3;
const distanceModel = "inverse";
const maxDistance = 10;
const refDistance = 2;
const rollOff = 2;

// Set initial listener position at center
const posX = 0;
const posY = 1.7; // Typical standing ear height in meters
const posZ = 0;
listener.positionX.value = posX;
listener.positionY.value = posY;
listener.positionZ.value = posZ;

// Default listener orientation (looking forward along negative Z-axis)
listener.forwardX.value = 0;
listener.forwardY.value = 0;
listener.forwardZ.value = -1;
listener.upX.value = 0;
listener.upY.value = 1;
listener.upZ.value = 0;

// Create convolver for reverb effects
const reverbNode = audioCtx.createConvolver();
fetch(document.getElementById("ir-response").src)
    .then(response => response.arrayBuffer())
    .then(arraybuffer => audioCtx.decodeAudioData(arraybuffer))
    .then(decodedData => {
        reverbNode.buffer = decodedData;
    })
    .catch(e => console.error("Error loading reverb:", e));

/*--------------------Sound Source Setup--------------------*/
// Function to get hexagonal positions with specific angles
function getHexPosition(index, radius) {
    // Define specific angles for each speaker (in degrees)
    const speakerAngles = [
        210, // Speaker 1 (left front)
        150, // Speaker 2 (right front)
        90,  // Speaker 3 (right)
        30,  // Speaker 4 (right back)
        330, // Speaker 5 (left back)
        270  // Speaker 6 (left)
    ];
    
    const angle = (speakerAngles[index] * Math.PI) / 180; // Convert to radians
    return {
        x: radius * Math.sin(angle),
        y: posY, // Same height as listener
        z: radius * Math.cos(angle)
    };
}

// Create 6 audio sources in a hexagonal arrangement
const speakerRadius = 7; // 7 meters from center
const sources = Array.from({ length: 6 }, (_, i) => getHexPosition(i, speakerRadius));

// Create PannerNodes for spatial positioning
const panners = sources.map(source => {
    // Calculate orientation toward the center
    const dx = posX - source.x;
    const dy = posY - source.y;
    const dz = posZ - source.z;
    const mag = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    return new PannerNode(audioCtx, {
        panningModel: "HRTF",
        distanceModel: distanceModel,
        positionX: source.x,
        positionY: source.y,
        positionZ: source.z,
        orientationX: dx/mag,
        orientationY: dy/mag,
        orientationZ: dz/mag,
        refDistance: refDistance,
        maxDistance: maxDistance,
        rolloffFactor: rollOff,
        coneInnerAngle: innerCone,
        coneOuterAngle: outerCone,
        coneOuterGain: outerGain
    });
});

// Create GainNodes for volume control and connect to global array
const gainNodes = panners.map(() => new GainNode(audioCtx, { gain: 0 }));
window.gainNodes = gainNodes;

// Create master volume control
const masterGain = new GainNode(audioCtx, { gain: 0.8 });

// Get the audio element
const audioElement = document.getElementById("double");

// Connect to the audio context
const audioSource = audioCtx.createMediaElementSource(audioElement);

// Connect each panner to its gain node and to master output
panners.forEach((panner, index) => {
    audioSource.connect(panner);
    panner.connect(gainNodes[index]);
    gainNodes[index].connect(masterGain);
});

// Connect master gain to destination
masterGain.connect(audioCtx.destination);

// Optional: Add reverb as a parallel path
const reverbGain = new GainNode(audioCtx, { gain: 0.3 });
panners.forEach((panner) => {
    audioSource.connect(panner).connect(reverbNode).connect(reverbGain).connect(masterGain);
});

/*--------------------UI Controls--------------------*/
// Play/Pause button functionality
const playPauseButton = document.getElementById('playPauseButton');
playPauseButton.addEventListener('click', togglePlayback);

function togglePlayback() {
    // Ensure audio context is running
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    if (playPauseButton.dataset.playing === 'false') {
        // Start playback
        audioElement.play();
        playPauseButton.dataset.playing = 'true';
        playPauseButton.style.setProperty('--play-pause-icon', '"\\23F8"'); // Pause icon
        playPauseButton.title = "Pause Audio"; // Update tooltip text
        
        // Start pattern switching at current time position
        startPatternSwitching();
    } else {
        // Pause playback
        audioElement.pause();
        playPauseButton.dataset.playing = 'false';
        playPauseButton.style.setProperty('--play-pause-icon', '"\\25B6"'); // Play icon
        playPauseButton.title = "Play Audio"; // Update tooltip text
        
        // Stop pattern switching
        stopPatternSwitching();
    }
}

// Reset button functionality
const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', resetPlayback);

function resetPlayback() {
    // Reset audio
    const wasPlaying = playPauseButton.dataset.playing === 'true';
    audioElement.pause();
    audioElement.currentTime = 0;
    playPauseButton.dataset.playing = 'false';
    playPauseButton.style.setProperty('--play-pause-icon', '"\\25B6"');
    
    // Reset pattern index
    currentPatternIndex = 0;
    
    // Apply the initial pattern
    applyPattern(currentPatternIndex);
    
    // Stop pattern switching
    stopPatternSwitching();
    
    // Reset orientation via the visualizer's reset method
    if (window.visualizer3D) {
        window.visualizer3D.resetOrientation();
    }
    
    // Restart playback if it was playing
    if (wasPlaying) {
        setTimeout(() => togglePlayback(), 50);
    }
}

// Function to ensure audio context is running after user interaction
function ensureAudioContextRunning() {
    if (audioCtx.state !== 'running') {
        audioCtx.resume().then(() => {
            console.log('AudioContext resumed successfully');
        });
    }
}

// React to user interactions
document.addEventListener('click', ensureAudioContextRunning);
document.addEventListener('keydown', ensureAudioContextRunning);

// Set initial gain values for the speakers
function setInitialSpeakerGains() {
    // Set initial gain values for demonstration
    const initialGains = [0.5, 0.3, 0.7, 0.4, 0.6, 0.2];
    
    gainNodes.forEach((gainNode, index) => {
        gainNode.gain.value = initialGains[index];
    });
    
    // Update the visualization
    if (window.updateVisualization3D) {
        window.updateVisualization3D(gainNodes);
    }
}

// Initialize when the page is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Set initial speaker gain values after a short delay
    // to make sure visualization is ready
    setTimeout(setInitialSpeakerGains, 1000);
    
    // Add keyboard shortcuts for adjusting speaker gains
    document.addEventListener('keydown', (event) => {
        // Keys 1-6 control individual speaker volumes
        if (event.key >= '1' && event.key <= '6') {
            const index = parseInt(event.key) - 1;
            const currentGain = gainNodes[index].gain.value;
            const newGain = currentGain < 0.5 ? 1.0 : 0.0; // Toggle between off and full
            
            // Smoothly transition to new value
            gainNodes[index].gain.setTargetAtTime(newGain, audioCtx.currentTime, 0.1);
            
            // Update visualization
            if (window.updateVisualization3D) {
                // Give a little time for the transition, then update
                setTimeout(() => {
                    window.updateVisualization3D(gainNodes);
                }, 100);
            }
        }
    });
    
    // Set title attributes for tooltips
    if (playPauseButton) playPauseButton.title = "Play Audio";
    if (resetButton) resetButton.title = "Reset to Beginning";
});

// Pattern switching control functions
let patternInterval = null;
let currentPatternIndex = 0;

function startPatternSwitching() {
    // Clear any existing interval
    stopPatternSwitching();
    
    // Start tracking time for pattern changes
    patternInterval = setInterval(checkTimeAndUpdatePattern, 50); // Check every 50ms
}

function stopPatternSwitching() {
    if (patternInterval) {
        clearInterval(patternInterval);
        patternInterval = null;
    }
}

// Accurate timestamp and pattern arrays for the audio piece
const images = [
    "sigle1.png", "sigle2.png", "sigle3.png", "sigle4.png", "sigle5.png", "sigle6.png", 
    "sigle7.png", "sigle8.png", "sigle9.png", "sigle10.png", "sigle11.png", "sigle12.png", 
    "sigle13.png", "sigle14.png", "sigle15.png", "sigle16.png", "sigle17.png", "sigle18.png", 
    "sigle19.png", "sigle20.png", "sigle21.png", "sigle22.png", "sigle23.png", "sigle24.png", 
    "sigle25.png", "sigle26.png", "sigle27.png"
];

const timestamps = [
    0, 1.483, 3.311, 4.59, 7.863, 11.365, 17.314, 18.926, 23.75, 
    31.035, 33.334, 36.547, 37.723, 40.114, 41.014, 42.203, 43.957, 
    45.172, 45.783, 47.39, 48.731, 50.323, 52.462, 55.005, 59.489, 
    63.377, 68.79
];

const presets = [
    [1, 0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0],
    [0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 1],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 1, 0, 0, 1],
    [0, 1, 0, 0, 1, 0],
    [0, 1, 0, 1, 0, 0],
    [1, 0, 0, 0, 0, 1],
    [1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 0],
    [0, 0, 1, 0, 0, 1],
    [0, 1, 1, 0, 0, 0],
    [0, 1, 1, 1, 0, 0],
    [0, 1, 0, 1, 1, 0],
    [1, 1, 0, 0, 1, 0],
    [1, 0, 0, 0, 1, 1],
    [0, 0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0, 1],
    [1, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 0, 1],
    [1, 1, 1, 1, 0, 1],
    [1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0]
];

// Make timestamps and presets available globally for the anticipation visualization
window.timestamps = timestamps;
window.presets = presets;

// Function to check audio time and update pattern accordingly
function checkTimeAndUpdatePattern() {
    if (!audioElement || audioElement.paused) return;
    
    const currentTime = audioElement.currentTime;
    
    // Find the appropriate pattern for the current time
    let newIndex = timestamps.findIndex((timestamp, index) => {
        const nextTimestamp = timestamps[index + 1] || Infinity;
        return currentTime >= timestamp && currentTime < nextTimestamp;
    });
    
    // Fallback to the first pattern if none found
    if (newIndex === -1) newIndex = 0;
    
    // Only update if the pattern has changed
    if (newIndex !== currentPatternIndex) {
        currentPatternIndex = newIndex;
        applyPattern(currentPatternIndex);
    }

    // Update the visualization regardless of pattern changes for smooth animation
    if (window.updateVisualization3D) {
        window.updateVisualization3D(gainNodes);
    }
}

// Apply a specific pattern
function applyPattern(index) {
    const pattern = presets[index];
    
    // Apply the pattern with a smooth transition
    pattern.forEach((gain, idx) => {
        if (gainNodes[idx]) {
            gainNodes[idx].gain.setTargetAtTime(gain, audioCtx.currentTime, 0.1);
        }
    });
    
    // Update visualization
    if (window.updateVisualization3D) {
        setTimeout(() => {
            window.updateVisualization3D(gainNodes);
        }, 100);
    }
}

// Handle the end of audio playback
audioElement.addEventListener('ended', () => {
    playPauseButton.dataset.playing = 'false';
    playPauseButton.style.setProperty('--play-pause-icon', '"\\25B6"');
    
    // Stop pattern switching
    stopPatternSwitching();
});

// Update 3D visualization when audio is playing
audioElement.addEventListener('timeupdate', () => {
    // Update visualizations based on the current speaker gains
    if (window.updateVisualization3D) {
        window.updateVisualization3D(gainNodes);
    }
    
    // Also update audio visualizer playhead position
    if (window.audioVisualizer && window.audioVisualizer.updateSpeakerActivity) {
        window.audioVisualizer.updateSpeakerActivity();
    }
});

// Sheet music functionality
document.addEventListener('DOMContentLoaded', () => {
    // Create toggle button for sheet music
    const toggleButton = document.createElement('div');
    toggleButton.className = 'toggle-sheet-music';
    toggleButton.innerHTML = 'Toggle Score';
    
    // Add toggle button to the DOM
    document.getElementById('immersive-container').appendChild(toggleButton);
    
    const sheetMusicContainer = document.querySelector('.sheet-music-container');
    let isSheetMusicVisible = true;
    
    // Toggle sheet music visibility
    toggleButton.addEventListener('click', () => {
        if (isSheetMusicVisible) {
            sheetMusicContainer.style.height = '0';
            toggleButton.style.bottom = '0';
            document.querySelector('.audio-controls').style.bottom = '30px';
            document.getElementById('joystick-container').style.bottom = '100px';
        } else {
            sheetMusicContainer.style.height = window.innerWidth <= 768 ? '100px' : '150px';
            toggleButton.style.bottom = window.innerWidth <= 768 ? '100px' : '150px';
            document.querySelector('.audio-controls').style.bottom = window.innerWidth <= 768 ? '120px' : '170px';
            document.getElementById('joystick-container').style.bottom = window.innerWidth <= 768 ? '120px' : '170px';
        }
        isSheetMusicVisible = !isSheetMusicVisible;
    });
    
    // Adjust positions now that we've removed the audio visualization container
    document.querySelector('.audio-controls').style.bottom = window.innerWidth <= 768 ? '120px' : '170px';
    document.getElementById('joystick-container').style.bottom = window.innerWidth <= 768 ? '120px' : '170px';
});