import OverviewTimeline from './js/OverviewTimeline.js';
import KeywordPanel from './js/KeywordPanel.js';
import SynthesiaDisplay from './js/Synthesia.js';

/*--------------------Global Variables--------------------*/
var masterGainNodeDoubleMaxGain = 0.20;
var masterGainNodePremiereMaxGain = 0.40;
var masterGainNodePianoReverbMaxGain = 0.10;
let currentTimeStampPresetIndex = 0;

// Add flags for channel 7 and 8 visibility and user control over sound source locations
let channel7Flag = false;
let channel8Flag = false;
let soundSourceMoveFlag = false;

const images = [
    "sigle1.png", "sigle2.png", "sigle3.png", "sigle4.png"
];

const timestamps = [
    0, 1.483, 63.377, 69.01
];

const presets = [
    [1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0]
];

let footerDefaultDisplay = true;
let contentDefaultDisplay = true;

let listenerRotation = 0;
const rotationSpeed = 2; // Degrees per frame
let isRotatingLeft = false;
let isRotatingRight = false;

let currentPlaybackSpeed = 1;
const playbackSpeeds = [0.7, 1];
/*--------------------Global Variables--------------------*/



/*--------------------Web Audio Environment Setup--------------------*/
// Create a context and listener
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext({ latencyHint: 'interactive' });
const listener = audioCtx.listener;

// Function to ensure audio context is running
function ensureAudioContextRunning() {
    if (audioCtx.state !== 'running') {
        audioCtx.resume().then(() => {
            console.log('AudioContext resumed successfully');
        });
    }
}

// Call this function on page load and user interaction
window.addEventListener('load', ensureAudioContextRunning);
document.body.addEventListener('click', ensureAudioContextRunning);
document.body.addEventListener('keydown', ensureAudioContextRunning);

// Set the listener's position
const posX = window.innerWidth / 2;
const posY = window.innerHeight / 2;
const posZ = 0;

listener.positionX.value = posX;
listener.positionY.value = posY;
listener.positionZ.value = posZ;
const listenerPos = { x: posX, y: posY, z: posZ };

// Default settings of the listener's orientation
listener.forwardX.value = 0;
listener.forwardY.value = 0;
listener.forwardZ.value = -1;
listener.upX.value = 0;
listener.upY.value = 1;
listener.upZ.value = 0;

// Load the impulse responses for the premiere; upon load, connect it to the audio output
// IR response acquired from http://reverbjs.org/; feel free to switch it to a room reverb that fits the project
// Live clarinet going through a room reverb
const premiereReverbURL = "http://reverbjs.org/Library/MidiverbMark2Preset29.m4a";
const premiereReverbNode = audioCtx.createConvolver();
fetch(premiereReverbURL)
    .then(response => response.arrayBuffer())
    .then(arraybuffer => audioCtx.decodeAudioData(arraybuffer))
    .then(decodedData => {
        // The reverb node for the premiere is ready and now can be used in the audio routing below
        premiereReverbNode.buffer = decodedData;
    })
    .catch(e => console.error("Error loading or decoding reverb file:", e));

// Live clarinet going through a piano reverb
// The following is a piano reverb already available that comes with Reverb JS
// const pianoReverbURL = "http://reverbjs.org/Library/InsidePiano.m4a";
const pianoReverbPath = document.getElementById("ir-response");
const pianoReverbNode = audioCtx.createConvolver();
fetch(pianoReverbPath.src)
    .then(response => response.arrayBuffer())
    .then(arraybuffer => audioCtx.decodeAudioData(arraybuffer))
    .then(decodedData => {
        // The reverb node for the premiere is ready and now can be used in the audio routing below
        pianoReverbNode.buffer = decodedData;
    })
    .catch(e => console.error("Error loading or decoding reverb file:", e));

// Constants for panner properties
const innerCone = 30;
const outerCone = 60;
const outerGain = 0.3;
const distanceModel = "inverse";
const maxDistance = 40;
const refDistance = 5;
const rollOff = 3;
/*--------------------Web Audio Environment Setup--------------------*/



/*--------------------Sound Source Panner Nodes and Effect Chain Setup--------------------*/
// Create PannerNode for each sound source
// PositionX: left (-) or right (+)
// PositionY: down (-) or up (+)
// PositionZ: back (-) or front (0)
const sources = [
    { positionX: posX - 1, positionY: posY, positionZ: posZ - 1.7321 }, // Channel 1
    { positionX: posX + 1, positionY: posY, positionZ: posZ - 1.7321 }, // Channel 2
    { positionX: posX + 2, positionY: posY, positionZ: posZ }, // Channel 3
    { positionX: posX + 1, positionY: posY, positionZ: posZ + 1.7321 }, // Channel 4
    { positionX: posX - 1, positionY: posY, positionZ: posZ + 1.7321 }, // Channel 5
    { positionX: posX - 2, positionY: posY, positionZ: posZ }, // Channel 6
    { positionX: posX + 1.75, positionY: posY, positionZ: posZ - 2.75}, // Channel 7 (piano reverb)
    { positionX: posX, positionY: posY, positionZ: posZ - 0.67 } // Channel 8 (premiere)
];

// Function to calculate orientation
function calculateOrientation(listenerPos, sourcePos) {
    const orientationX = listenerPos.x - sourcePos.x;
    const orientationY = listenerPos.y - sourcePos.y;
    const orientationZ = listenerPos.z - sourcePos.z;

    const length = Math.sqrt(orientationX ** 2 + orientationY ** 2 + orientationZ ** 2);

    return {
        orientationX: orientationX / length,
        orientationY: orientationY / length,
        orientationZ: orientationZ / length
    };
}

sources.forEach(source => {
    const orientation = calculateOrientation(listenerPos, {
        x: source.positionX,
        y: source.positionY,
        z: source.positionZ
    });

    source.orientationX = orientation.orientationX;
    source.orientationY = orientation.orientationY;
    source.orientationZ = orientation.orientationZ;
});

const panners = sources.map(source => {
    return new PannerNode(audioCtx, {
        panningModel: "HRTF", // Using HRTF model
        distanceModel,
        positionX: source.positionX,
        positionY: source.positionY,
        positionZ: source.positionZ,
        orientationX: source.orientationX,
        orientationY: source.orientationY,
        orientationZ: source.orientationZ,
        refDistance,
        maxDistance,
        rolloffFactor: rollOff,
        coneInnerAngle: innerCone,
        coneOuterAngle: outerCone,
        coneOuterGain: outerGain
    });
});

// Create GainNodes for each sound source and master GainNodes
const gainNodes = sources.map(() => new GainNode(audioCtx, { gain: 0 }));
const masterGainNodeDouble = new GainNode(audioCtx, { gain: masterGainNodeDoubleMaxGain });
const masterGainNodePremiere = new GainNode(audioCtx, { gain: masterGainNodePremiereMaxGain });
const masterGainNodePianoReverb = new GainNode(audioCtx, { gain: masterGainNodePianoReverbMaxGain });

// Create GainNodes for dry and wet signals
const dryGainNode = new GainNode(audioCtx, { gain: 1 });
const wetGainNode = new GainNode(audioCtx, { gain: 0 });

// Set the audio context destination to support the maximum number of output channels
audioCtx.destination.channelCount = audioCtx.destination.maxChannelCount;
console.log(audioCtx.destination.channelCount);
audioCtx.destination.channelCountMode = "explicit";
audioCtx.destination.channelInterpretation = "speakers";

// Get the audio elements
const audioElementDouble = document.getElementById("double");
const audioElementPremiere = document.getElementById("premiere");

// Pass them into the audio context
const trackDouble = audioCtx.createMediaElementSource(audioElementDouble);
const trackPremiere = audioCtx.createMediaElementSource(audioElementPremiere);

// Connect each panner node to its respective GainNode and then to the master GainNodes and destination
panners.forEach((panner, index) => {
    if (index < 6) {
        trackDouble.connect(panner).connect(gainNodes[index]).connect(masterGainNodeDouble).connect(audioCtx.destination);
    } else if (index < 7) {
        // trackPremiere.connect(panner).connect(pianoReverbNode).connect(gainNodes[index]).connect(masterGainNodePianoReverb).connect(audioCtx.destination);
        trackPremiere.connect(panner).connect(dryGainNode).connect(gainNodes[6]).connect(masterGainNodePianoReverb).connect(audioCtx.destination);
        trackPremiere.connect(panner).connect(pianoReverbNode).connect(wetGainNode).connect(gainNodes[6]).connect(masterGainNodePianoReverb).connect(audioCtx.destination);
    } else {
        trackPremiere.connect(panner).connect(premiereReverbNode).connect(gainNodes[index]).connect(masterGainNodePremiere).connect(audioCtx.destination);
    }
});
/*--------------------Sound Source Panner Nodes and Effect Chain Setup--------------------*/



/*--------------------Play/Pause Button and Sliders--------------------*/
// Select our play button
const playPauseButton = document.getElementById('playPauseButton');
const resetButton = document.getElementById('resetButton');
const videoPlayer = document.getElementById('videoPlayer');
videoPlayer.muted = true;

// Function to handle play/pause
function togglePlay() {
    // Check if context is in suspended state (autoplay policy)
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }

    // Play or pause tracks depending on state
    if (playPauseButton.dataset.playing === "false") {
        audioElementDouble.play();
        audioElementPremiere.play();
        videoPlayer.play();
        playPauseButton.dataset.playing = "true";
        playPauseButton.style.setProperty('--play-pause-icon', '"\\23F8"');
        if (contentMode === 'synthesia' && synthesiaDisplay) {
            synthesiaDisplay.play(audioElementPremiere.currentTime);
        }
    } else if (playPauseButton.dataset.playing === "true") {
        audioElementDouble.pause();
        audioElementPremiere.pause();
        videoPlayer.pause();
        playPauseButton.dataset.playing = "false";
        playPauseButton.style.setProperty('--play-pause-icon', '"\\25B6"');
        if (synthesiaDisplay) {
            synthesiaDisplay.pause();
        }

        // Reset playback speed to 100% when stopped
        currentPlaybackSpeed = 1;
        audioElementDouble.playbackRate = 1;
        audioElementPremiere.playbackRate = 1;
        videoPlayer.playbackRate = 1;
        playbackSpeedButton.textContent = "100%";
    }
}

// Add click event listener to the play button
playPauseButton.addEventListener("click", togglePlay);
resetButton.addEventListener("click", resetPlayback);

// Function to handle audio end
function handleAudioEnd() {
    playPauseButton.dataset.playing = "false";
    playPauseButton.style.setProperty('--play-pause-icon', '"\\25B6"');
}
// Add 'ended' event listeners to both audio elements
audioElementDouble.addEventListener('ended', handleAudioEnd);
audioElementPremiere.addEventListener('ended', handleAudioEnd);

const progressContainer = document.getElementById('progressContainer');
let overviewTimeline;
const scrollContainer = document.querySelector('.scroll-container');
const scoreImage = scrollContainer.querySelector('img');

// Function to calculate and set the scroll position
function updateScoreScroll(currentTime) {
    const lastCueOffset = 4.21; // The score should be at the end by the start of the last cue
    const scrollProgress = currentTime / (audioElementPremiere.duration - lastCueOffset);
    const scrollAmount = (scoreImage.offsetHeight - scrollContainer.offsetHeight) * scrollProgress;
    scrollContainer.scrollTop = scrollAmount;
}

function scrollToHighlightedRow() {
    const technicalGuide = document.getElementById('technical-guide');
    const highlightedRow = technicalGuide.querySelector('.zig-zag-table tbody tr.highlighted');

    if (highlightedRow) {
        const containerRect = technicalGuide.getBoundingClientRect();
        const rowRect = highlightedRow.getBoundingClientRect();

        // Calculate the scroll position to center the row
        const scrollPosition = rowRect.top + technicalGuide.scrollTop - containerRect.top - (containerRect.height / 2) + (rowRect.height / 2);

        // Smooth scroll to the calculated position
        technicalGuide.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
        });
    }
}

function updateProgress() {
    if (overviewTimeline) {
        overviewTimeline.updatePlayhead(audioElementPremiere.currentTime);
    }
    updateScoreScroll(audioElementPremiere.currentTime);
}

function setProgress(time) {
    audioElementDouble.currentTime = time;
    audioElementPremiere.currentTime = time;
    videoPlayer.currentTime = time;
    if (contentMode === 'synthesia' && synthesiaDisplay) {
        synthesiaDisplay.seek(time);
        if (audioElementPremiere.paused) {
            synthesiaDisplay.pause();
        } else {
            synthesiaDisplay.play(time);
        }
    }
    updateProgress();
}

function updateZigZagTableHighlight(presetIndex) {
    // Remove highlight from all rows
    document.querySelectorAll('.zig-zag-table tbody tr').forEach(row => {
        row.classList.remove('highlighted');
    });

    // Highlight the corresponding row based on the first td value
    const rows = document.querySelectorAll('.zig-zag-table tbody tr');
    for (let row of rows) {
        const firstCell = row.querySelector('td:first-child');
        if (firstCell && firstCell.textContent.trim() === (presetIndex + 1).toString()) {
            row.classList.add('highlighted');
            break;
        }
    }

    // Scroll to the highlighted row
    scrollToHighlightedRow();
}

function updateImage() {
    const currentTime = audioElementPremiere.currentTime;
    let imageIndex = 0;
    for (let i = timestamps.length - 1; i >= 0; i--) {
        if (currentTime >= timestamps[i]) {
            imageIndex = i;
            break;
        }
    }

    // Remove previous highlights
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('timestamp-highlighted');
    });

    // Highlight the current preset
    const currentPreset = document.querySelectorAll('.preset-btn')[imageIndex];
    if (currentPreset) {
        currentPreset.classList.add('timestamp-highlighted');

        // Scroll the highlighted preset to the left
        const presetControls = document.getElementById('presetControls');
        presetControls.scrollLeft = currentPreset.offsetLeft - presetControls.offsetLeft - 5;

        // Update the zig-zag table highlight
        updateZigZagTableHighlight(imageIndex);
    }

    // Apply corresponding preset only if in Live Mix mode (footerDefaultDisplay is false)
    if (!footerDefaultDisplay && imageIndex !== currentTimeStampPresetIndex) {
        currentTimeStampPresetIndex = imageIndex; // Update the global preset index
        currentPreset.click();
    }
}

function resetPlayback() {
    audioElementDouble.pause();
    audioElementPremiere.pause();
    videoPlayer.pause();

    audioElementDouble.currentTime = 0;
    audioElementPremiere.currentTime = 0;
    videoPlayer.currentTime = 0;

    if (synthesiaDisplay) {
        synthesiaDisplay.stop();
    }

    playPauseButton.dataset.playing = "false";
    playPauseButton.style.setProperty('--play-pause-icon', '"\\25B6"');

    updateProgress();
    updateImage();

    // Reset playback speed to 100%
    currentPlaybackSpeed = 1;
    audioElementDouble.playbackRate = 1;
    audioElementPremiere.playbackRate = 1;
    videoPlayer.playbackRate = 1;
    playbackSpeedButton.textContent = "100%";
}

// Event listeners for audio updates and interaction
audioElementPremiere.addEventListener('loadedmetadata', () => {
    overviewTimeline = new OverviewTimeline(progressContainer, timestamps, audioElementPremiere.duration);
    overviewTimeline.addClickListener(setProgress);
});

audioElementPremiere.addEventListener('timeupdate', () => {
    updateProgress();
    updateImage();
    // Synchronize video playback
    if (Math.abs(videoPlayer.currentTime - audioElementPremiere.currentTime) > 0.1) {
        videoPlayer.currentTime = audioElementPremiere.currentTime;
    }

    if (contentMode === 'synthesia' && synthesiaDisplay) {
        synthesiaDisplay.start(audioElementPremiere.currentTime);
    }
});

progressContainer.addEventListener('click', setProgress);

// Function to create sliders for gain control
function createSlider(labelText, gainNode, min = 0., max = 1.) {
    const container = document.createElement("div");
    container.className = "slider-container";
    const label = document.createElement("label");
    label.textContent = labelText;
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = min;
    slider.max = max;
    slider.step = 0.01;
    slider.value = gainNode.gain.value;
    slider.addEventListener("input", () => {
        gainNode.gain.value = parseFloat(slider.value);
        drawVisualizationTop();
        drawVisualizationFront();
    });
    slider.style.transform = "rotate(270deg)";
    container.appendChild(label);
    container.appendChild(slider);
    return { container, slider };  // Return both the container and the slider
}

// Create a function to handle dry/wet balance
function setDryWetBalance(wetAmount) {
    const dryAmount = 1 - wetAmount;
    dryGainNode.gain.value = dryAmount;
    wetGainNode.gain.value = wetAmount;
}

// Create the dry/wet slider
function createDryWetSlider() {
    const container = document.createElement("div");
    container.className = "slider-container";
    const label = document.createElement("label");
    label.textContent = "Piano Reverb Dry/Wet";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = 0;
    slider.max = 1;
    slider.step = 0.01;
    slider.value = 1; // Start with fully dry
    slider.addEventListener("input", () => {
        const wetAmount = parseFloat(slider.value);
        setDryWetBalance(wetAmount);
        drawVisualizationTop();
        drawVisualizationFront();
    });
    container.appendChild(label);
    container.appendChild(slider);
    return { container, slider };
}

// Initialize the dry/wet balance
setDryWetBalance(1); // Start with fully wet

// Create sliders for each GainNode and the master GainNode
const column1 = document.getElementById("column1");
const column2 = document.getElementById("column2");
const column3 = document.getElementById("column3");
const sliders = [];  // Array to hold references to slider elements

// Column 1
for (let i = 0; i < 6; i++) {
    const { container, slider } = createSlider(`Speaker ${i + 1}`, gainNodes[i]);
    column1.appendChild(container);
    sliders.push(slider);
}

// Column 2
const { container: dryWetContainer, slider: dryWetSlider } = createDryWetSlider();
column2.appendChild(dryWetContainer);
sliders.push(dryWetSlider);

// Column 3
const { container: premiereContainer, slider: premiereSlider } = createSlider("Clarinette Premiere", gainNodes[7]);
column3.appendChild(premiereContainer);
sliders.push(premiereSlider);

const { container: pianoReverbContainer, slider: pianoReverbSlider } = createSlider("Piano Reverb", gainNodes[6]);
column3.appendChild(pianoReverbContainer);
sliders.push(pianoReverbSlider);

const { container: doubleMasterVolumeContainer, slider: doubleMasterVolumeSlider } = createSlider("Double Master", masterGainNodeDouble, 0., masterGainNodeDoubleMaxGain);
column3.appendChild(doubleMasterVolumeContainer);
sliders.push(doubleMasterVolumeSlider);

const { container: premiereMasterVolume, slider: premiereMasterSlider } = createSlider("Premiere Master", masterGainNodePremiere, 0, masterGainNodePremiereMaxGain);
column3.appendChild(premiereMasterVolume);
sliders.push(premiereMasterSlider);

const { container: pianoReverbMasterContainer, slider: pianoReverbMasterSlider } = createSlider("Piano Reverb Master", masterGainNodePianoReverb, 0, masterGainNodePianoReverbMaxGain);
column3.appendChild(pianoReverbMasterContainer);
sliders.push(pianoReverbMasterSlider);

/*--------------------Play/Pause Button and Sliders--------------------*/



/*--------------------Presets of Slider Values--------------------*/
document.querySelectorAll('.preset-btn').forEach((button, index) => {
    button.setAttribute('data-index', index + 1);
    button.addEventListener('click', function() {
        const presetValues = this.getAttribute('data-preset').split(',').map(Number);
        setVolumes(presetValues);
        highlightPreset(this);
        updateZigZagTableHighlight(index);
        drawVisualizationTop();
        drawVisualizationFront();
    });
});

function highlightPreset(selectedButton) {
    // Remove highlight from all buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('highlighted');
    });

    // Add highlight to the clicked button
    selectedButton.classList.add('highlighted');

    // Auto-center the selected preset
    const presetControls = document.getElementById('presetControls');
    const buttonRect = selectedButton.getBoundingClientRect();
    const containerRect = presetControls.getBoundingClientRect();

    const scrollTop = buttonRect.top + presetControls.scrollTop - containerRect.top - (containerRect.height / 2) + (buttonRect.height / 2);

    presetControls.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
    });
}

// Function to gradually adjust volume and update the UI according to preset configurations
function setVolumes(volumes) {
    const rampTime = parseFloat(document.getElementById('ramp-time-slider').value);
    const steps = rampTime / (1000 / 60); // Assuming 60 frames per second
    const increment = volumes.map((targetVolume, index) =>
        (targetVolume / 100 - gainNodes[index].gain.value) / steps);

    let stepCount = 0;

    function rampVolume() {
        if (stepCount < steps) {
            gainNodes.forEach((gainNode, index) => {
                gainNode.gain.value += increment[index];
                sliders[index].value = gainNode.gain.value;
            });
            drawVisualizationTop();
            drawVisualizationFront();
            stepCount++;
            requestAnimationFrame(rampVolume);
        } else {
            // Ensure final values are set precisely at the end of the ramp
            gainNodes.forEach((gainNode, index) => {
                gainNode.gain.value = volumes[index] / 100;
                sliders[index].value = gainNode.gain.value;
            });
            drawVisualizationTop();
            drawVisualizationFront();
        }
    }

    rampVolume();
}

// Key bindings
let keyStates = {
    '1': { pressed: false, value: 0 },
    '2': { pressed: false, value: 0 },
    '3': { pressed: false, value: 0 },
    '4': { pressed: false, value: 0 },
    '5': { pressed: false, value: 0 },
    '6': { pressed: false, value: 0 }
};

function updateGainWithRamp(index, targetValue, rampTime) {
    const startValue = gainNodes[index].gain.value;
    const startTime = audioCtx.currentTime;
    const endTime = startTime + rampTime / 1000;  // Convert ms to seconds

    gainNodes[index].gain.setValueAtTime(startValue, startTime);
    gainNodes[index].gain.linearRampToValueAtTime(targetValue, endTime);

    // Update the corresponding slider value
    const updateSlider = () => {
        const now = audioCtx.currentTime;
        if (now < endTime) {
            const progress = (now - startTime) / (endTime - startTime);
            const currentValue = startValue + progress * (targetValue - startValue);
            sliders[index].value = currentValue;
            requestAnimationFrame(updateSlider);
        } else {
            sliders[index].value = targetValue;
        }
        // Redraw visualizations
        drawVisualizationTop();
        drawVisualizationFront();
    };
    requestAnimationFrame(updateSlider);
}

document.addEventListener('keydown', function(event) {
    if (event.key >= '1' && event.key <= '6' && !keyStates[event.key].pressed) {
        const index = parseInt(event.key) - 1;
        const rampTime = parseFloat(document.getElementById('ramp-time-slider').value);
        keyStates[event.key].pressed = true;
        updateGainWithRamp(index, 1, rampTime);
    }
});

document.addEventListener('keyup', function(event) {
    if (event.key >= '1' && event.key <= '6') {
        const index = parseInt(event.key) - 1;
        const rampTime = parseFloat(document.getElementById('ramp-time-slider').value);
        keyStates[event.key].pressed = false;
        updateGainWithRamp(index, 0, rampTime);
    }
});

document.getElementById('ramp-time-slider').addEventListener('input', function() {
    document.getElementById('ramp-time-value').textContent = `${this.value} ms`;
});
/*--------------------Presets of Slider Values--------------------*/


/*---------------------Playback Speed Control---------------------*/
const togglePlaybackSpeed = document.getElementById('togglePlaybackSpeed');
const playbackOptions = togglePlaybackSpeed.querySelectorAll('.mode-option');

togglePlaybackSpeed.addEventListener('click', function(event) {
    if (event.target.classList.contains('mode-option')) {
        const mode = event.target.dataset.mode;

        // Remove 'playback-active' class from all options
        playbackOptions.forEach(opt => opt.classList.remove('playback-active'));
        // Add 'playback-active' class to the selected option
        event.target.classList.add('playback-active');

        // Calculate the width and transform for the highlight
        const width = event.target.offsetWidth;
        const transform = event.target.offsetLeft - 2; // Adjust for padding if necessary

        // Set the CSS custom properties
        togglePlaybackSpeed.style.setProperty('--highlight-width', `${width}px`);
        togglePlaybackSpeed.style.setProperty('--highlight-transform', `${transform}px`);

        // Update playback speed
        currentPlaybackSpeed = parseFloat(mode) / 100;
        audioElementDouble.playbackRate = currentPlaybackSpeed;
        audioElementPremiere.playbackRate = currentPlaybackSpeed;
        videoPlayer.playbackRate = currentPlaybackSpeed;
    }
});

// Initialize the highlight for the default active option
const defaultPlaybackOption = togglePlaybackSpeed.querySelector('.mode-option.playback-active');
if (defaultPlaybackOption) {
    // Calculate the initial highlight position and width
    const width = defaultPlaybackOption.offsetWidth;
    const transform = defaultPlaybackOption.offsetLeft - 2; // Adjust for padding if necessary

    togglePlaybackSpeed.style.setProperty('--highlight-width', `${width}px`);
    togglePlaybackSpeed.style.setProperty('--highlight-transform', `${transform}px`);

    // Set the initial playback speed based on the active option
    currentPlaybackSpeed = parseFloat(defaultPlaybackOption.dataset.mode) / 100;
    audioElementDouble.playbackRate = currentPlaybackSpeed;
    audioElementPremiere.playbackRate = currentPlaybackSpeed;
    videoPlayer.playbackRate = currentPlaybackSpeed;
}
/*---------------------Playback Speed Control---------------------*/



/*---------------------Canvas Display of Sound Source Positions---------------------*/
// Get canvas elements and contexts
const canvasTop = document.getElementById('audioVisualizerTop');
const ctxTop = canvasTop.getContext('2d');

const canvasFront = document.getElementById('audioVisualizerFront');
const ctxFront = canvasFront.getContext('2d');

let dragging = false;
let dragIndex = -1;
let activeCanvas = null;

const speakerImage = new Image();
speakerImage.src = 'images/speaker.png';
speakerImage.onload = () => {
    // Initial draw once the image is loaded
    drawVisualizationTop();
    drawVisualizationFront();
};

// Redraw visualizations to reflect any changes
// Load the listener image
const listenerImage = new Image();
listenerImage.src = 'images/listener.png';

// Ensure both images are loaded before drawing
let speakerImageLoaded = false;
let listenerImageLoaded = false;

speakerImage.onload = () => {
    speakerImageLoaded = true;
    if (listenerImageLoaded) {
        drawVisualizationTop();
        drawVisualizationFront();
    }
};

listenerImage.onload = () => {
    listenerImageLoaded = true;
    if (speakerImageLoaded) {
        drawVisualizationTop();
        drawVisualizationFront();
    }
};

let isCircularMotionActive = false;
let thumbAngle = 0;
const thumbRadius = 10;
let isDraggingThumb = false;

const toggleCircularDisplay = document.getElementById('toggleCircularDisplay');
const circularOptions = toggleCircularDisplay.querySelectorAll('.mode-option');

toggleCircularDisplay.addEventListener('click', function(event) {
    if (event.target.classList.contains('mode-option')) {
        const mode = event.target.dataset.mode;

        // Remove 'circular-active' class from all options
        circularOptions.forEach(opt => opt.classList.remove('circular-active'));
        // Add 'circular-active' class to the selected option
        event.target.classList.add('circular-active');

        // Toggle circular motion based on the selected mode
        if (mode === 'on') {
            isCircularMotionActive = true;
        } else {
            isCircularMotionActive = false;
            setVolumes([0, 0, 0, 0, 0, 0, 0, 0]);
            // Re-apply current preset to ensure synchronization
            if (currentTimeStampPresetIndex >= 0) {
                document.querySelectorAll('.preset-btn')[currentTimeStampPresetIndex].click();
            }
        }

        // Calculate the width and transform for the highlight
        const width = event.target.offsetWidth;
        const transform = event.target.offsetLeft - 2; // Adjust for padding if necessary

        // Set the CSS custom properties
        toggleCircularDisplay.style.setProperty('--highlight-width', `${width}px`);
        toggleCircularDisplay.style.setProperty('--highlight-transform', `${transform}px`);
    }
});

// Initialize the highlight for the default active option
const defaultCircularOption = toggleCircularDisplay.querySelector('.mode-option.circular-active');
if (defaultCircularOption) {
    // Calculate the initial highlight position and width
    const width = defaultCircularOption.offsetWidth;
    const transform = defaultCircularOption.offsetLeft - 2; // Adjust for padding if necessary

    toggleCircularDisplay.style.setProperty('--highlight-width', `${width}px`);
    toggleCircularDisplay.style.setProperty('--highlight-transform', `${transform}px`);

    // Set the initial state based on the active option
    if (defaultCircularOption.dataset.mode === 'on') {
        isCircularMotionActive = true;
    } else {
        isCircularMotionActive = false;
    }
}

function drawVisualizationTop() {
    ctxTop.clearRect(0, 0, canvasTop.width, canvasTop.height);

    const centerX = canvasTop.width / 2;
    const centerY = canvasTop.height / 2;

    // Draw the listener at the center using the image
    const listenerSize = 150;
    ctxTop.save();
    ctxTop.translate(centerX, centerY);
    ctxTop.rotate(listenerRotation * Math.PI / 180);
    ctxTop.drawImage(listenerImage, -listenerSize/2, -listenerSize/2, listenerSize, listenerSize);
    ctxTop.restore();

    // Calculate the radius for the new circle
    const circleRadius = Math.min(canvasTop.width, canvasTop.height) * 0.25;

    // Draw circle path only if circular motion is active
    if (isCircularMotionActive) {
        ctxTop.beginPath();
        ctxTop.arc(centerX, centerY, circleRadius, 0, 2 * Math.PI);
        ctxTop.strokeStyle = 'rgba(142, 68, 173, 0.7)'; // Teal color with some transparency
        ctxTop.lineWidth = 4;
        ctxTop.stroke();
    }

    // Draw each source
    sources.forEach((source, index) => {
        if (index >= 6) return; // Only draw the first 6 speakers

        const x = centerX + (source.positionX - posX) * 100;
        const y = centerY + (source.positionZ - posZ) * 100;

        // Calculate distance and angle to listener
        const distance = Math.sqrt((source.positionX - posX) ** 2 + (source.positionZ - posZ) ** 2);
        const angleToListener = Math.atan2(centerY - y, centerX - x);

        // Determine color based on volume
        const volume = gainNodes[index].gain.value;
        const color = volume === 0 ? 'rgb(182, 181, 178)' : `rgba(230, 145, 56, ${0.3 + volume * 0.7})`;

        // Draw ripples
        ctxTop.strokeStyle = color;
        const maxRipples = 4;
        for (let i = 0; i < maxRipples; i++) {
            const rippleRadius = (i + 1) * 30 + 30;
            const opacity = Math.max(0, 1 - distance / 10) * volume;
            ctxTop.globalAlpha = opacity * (1 - i / maxRipples);

            ctxTop.beginPath();
            ctxTop.arc(x, y, rippleRadius,
                angleToListener - Math.PI / 6,
                angleToListener + Math.PI / 6,
                false);
            ctxTop.stroke();
        }
        ctxTop.globalAlpha = 1;

        // Draw speaker image
        ctxTop.save();
        ctxTop.translate(x, y);
        ctxTop.rotate(angleToListener);

        const speakerSize = volume * 20 + 120;

        // Create a temporary canvas for coloring the speaker
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = speakerSize;
        tempCanvas.height = speakerSize;

        // Draw colored rectangle on temporary canvas
        tempCtx.fillStyle = color;
        tempCtx.fillRect(0, 0, speakerSize, speakerSize);

        // Use the speaker image as a mask
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(speakerImage, 0, 0, speakerSize, speakerSize);

        // Draw the resulting image back to the main canvas
        ctxTop.drawImage(tempCanvas, -speakerSize/2, -speakerSize/2);

        ctxTop.restore();

        // Add index number (not rotated)
        ctxTop.fillStyle = 'white';
        ctxTop.font = `${speakerSize/3}px Arial`;
        ctxTop.textAlign = 'center';
        ctxTop.textBaseline = 'middle';
        ctxTop.fillText(index + 1, x, y);
    });

    // Draw thumb only if circular motion is active
    if (isCircularMotionActive) {
        const thumbX = centerX + Math.cos(thumbAngle) * circleRadius;
        const thumbY = centerY + Math.sin(thumbAngle) * circleRadius;
        ctxTop.beginPath();
        ctxTop.arc(thumbX, thumbY, thumbRadius, 0, 2 * Math.PI);
        ctxTop.fillStyle = '#8e44ad'; // Solid teal color for the thumb
        ctxTop.fill();
        ctxTop.strokeStyle = 'white'; // Add a white border to the thumb for better visibility
        ctxTop.lineWidth = 2;
        ctxTop.stroke();

        // Update volumes based on thumb position
        updateVolumes(thumbX, thumbY, circleRadius);
    }
}

function calculateSpeakerAngles() {
    const centerX = canvasTop.width / 2;
    const centerY = canvasTop.height / 2;

    return sources.slice(0, 6).map(source => {
        const speakerX = centerX + (source.positionX - posX) * 100;
        const speakerY = centerY + (source.positionZ - posZ) * 100;
        return Math.atan2(speakerY - centerY, speakerX - centerX);
    });
}

function updateVolumes(thumbX, thumbY, circleRadius) {
    if (!isCircularMotionActive) return;

    const centerX = canvasTop.width / 2;
    const centerY = canvasTop.height / 2;

    // Calculate the angle of the thumb relative to the circle's center
    const thumbAngle = Math.atan2(thumbY - centerY, thumbX - centerX);

    // Get the current speaker angles
    const speakerAngles = calculateSpeakerAngles();

    // Calculate volumes based on angular distance
    speakerAngles.forEach((speakerAngle, index) => {
        let angleDiff = Math.abs(thumbAngle - speakerAngle);
        // Ensure we're using the smallest angle difference
        angleDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);

        // Calculate volume: 100% when angleDiff is 0, 0% when angleDiff is PI/3 or greater
        let volume = Math.max(0, 1 - (angleDiff / (Math.PI / 3)));

        gainNodes[index].gain.value = volume;
        sliders[index].value = volume;
    });
}

function handleCanvasMouseDown(event) {
    if (!isCircularMotionActive) return;

    const rect = canvasTop.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const centerX = canvasTop.width / 2;
    const centerY = canvasTop.height / 2;

    const dx = mouseX - centerX;
    const dy = mouseY - centerY;

    const circleRadius = Math.min(canvasTop.width, canvasTop.height) * 0.25;
    const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

    if (Math.abs(distanceFromCenter - circleRadius) < thumbRadius) {
        isDraggingThumb = true;
        thumbAngle = Math.atan2(dy, dx);
        drawVisualizationTop();
    }
}

function handleCanvasMouseMove(event) {
    if (!isCircularMotionActive || !isDraggingThumb) return;

    const rect = canvasTop.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const centerX = canvasTop.width / 2;
    const centerY = canvasTop.height / 2;

    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    thumbAngle = Math.atan2(dy, dx);

    drawVisualizationTop();
}

function handleCanvasMouseUp() {
    isDraggingThumb = false;
}

// Add event listeners for the new interaction
canvasTop.addEventListener('mousedown', handleCanvasMouseDown);
canvasTop.addEventListener('mousemove', handleCanvasMouseMove);
canvasTop.addEventListener('mouseup', handleCanvasMouseUp);
canvasTop.addEventListener('mouseleave', handleCanvasMouseUp);

function drawVisualizationFront() {
    ctxFront.clearRect(0, 0, canvasFront.width, canvasFront.height); // Clear the canvas first

    const centerX = canvasFront.width / 2;
    const centerY = canvasFront.height / 2;

    // Draw the listener at the center
    ctxFront.fillStyle = 'red';
    ctxFront.beginPath();
    ctxFront.arc(centerX, centerY, 10, 0, 2 * Math.PI);
    ctxFront.fill();
    ctxFront.fillText('Listener', centerX - 10, centerY - 15);

    // Draw each source
    sources.forEach((source, index) => {
        const x = centerX + (source.positionX - posX) * 50;
        const y = centerY - (source.positionY - posY) * 50;

        // Display the relative x, y, z values
        const relX = (source.positionX - posX).toFixed(2);
        const relY = (source.positionY - posY).toFixed(2);
        const relZ = (source.positionZ - posZ).toFixed(2);
        ctxFront.fillStyle = "rgb(0,200,0)";
        ctxFront.beginPath();
        ctxFront.arc(x, y, gainNodes[index].gain.value * 5 + 5, 0, 2 * Math.PI);
        ctxFront.fill();
        if (index < 6) {
            ctxFront.fillText(`Speaker ${index + 1}:`, x - 10, y - 25);
        } else if (index == 6) {
            ctxFront.fillText(`Piano Reverb:`, x - 10, y - 25);
        } else {
            ctxFront.fillText(`Clarinette Premiere`, x - 10, y - 25);
        }

        ctxFront.fillText(`${relX}, ${relY}, ${relZ}`, x - 10, y - 15);
    });
}


// Function to handle mousedown event for both canvases
function onMouseDown(event) {
    if (!soundSourceMoveFlag) return; // Exit the function if flag is false

    const rectTop = canvasTop.getBoundingClientRect();
    const xTop = event.clientX - rectTop.left;
    const yTop = event.clientY - rectTop.top;

    const rectFront = canvasFront.getBoundingClientRect();
    const xFront = event.clientX - rectFront.left;
    const yFront = event.clientY - rectFront.top;

    const centerXTop = canvasTop.width / 2;
    const centerYTop = canvasTop.height / 2;

    const centerXFront = canvasFront.width / 2;
    const centerYFront = canvasFront.height / 2;

    sources.forEach((source, index) => {
        const sourceXTop = centerXTop + (source.positionX - posX) * 50;
        const sourceYTop = centerYTop + (source.positionZ - posZ) * 50;

        const sourceXFront = centerXFront + (source.positionX - posX) * 50;
        const sourceYFront = centerYFront - (source.positionY - posY) * 50;

        if (Math.sqrt((xTop - sourceXTop) ** 2 + (yTop - sourceYTop) ** 2) < 10) {
            dragging = true;
            dragIndex = index;
            activeCanvas = 'top';
        } else if (Math.sqrt((xFront - sourceXFront) ** 2 + (yFront - sourceYFront) ** 2) < 10) {
            dragging = true;
            dragIndex = index;
            activeCanvas = 'front';
        }
    });
}

// Function to handle mousemove event for both canvases
function onMouseMove(event) {
    if (!soundSourceMoveFlag || !dragging || dragIndex === -1) return; // Exit if flag is false or not dragging

    if (activeCanvas === 'top') {
        const rectTop = canvasTop.getBoundingClientRect();
        const xTop = event.clientX - rectTop.left;
        const yTop = event.clientY - rectTop.top;

        const centerXTop = canvasTop.width / 2;
        const centerYTop = canvasTop.height / 2;

        // Update the x and z positions using the top view
        sources[dragIndex].positionX = posX + (xTop - centerXTop) / 50;
        sources[dragIndex].positionZ = posZ + (yTop - centerYTop) / 50;
    } else if (activeCanvas === 'front') {
        const rectFront = canvasFront.getBoundingClientRect();
        const xFront = event.clientX - rectFront.left;
        const yFront = event.clientY - rectFront.top;

        const centerXFront = canvasFront.width / 2;
        const centerYFront = canvasFront.height / 2;

        // Update the x and y positions using the front view
        sources[dragIndex].positionX = posX + (xFront - centerXFront) / 50;
        sources[dragIndex].positionY = posY - (yFront - centerYFront) / 50;
    }

    // Recalculate orientation for the source
    const orientation = calculateOrientation(listenerPos, {
        x: sources[dragIndex].positionX,
        y: sources[dragIndex].positionY,
        z: sources[dragIndex].positionZ
    });

    // Update the panner node values
    panners[dragIndex].positionX.value = sources[dragIndex].positionX;
    panners[dragIndex].positionY.value = sources[dragIndex].positionY;
    panners[dragIndex].positionZ.value = sources[dragIndex].positionZ;
    panners[dragIndex].orientationX.value = orientation.orientationX;
    panners[dragIndex].orientationY.value = orientation.orientationY;
    panners[dragIndex].orientationZ.value = orientation.orientationZ;

    drawVisualizationTop();
    drawVisualizationFront();
}

// Function to handle mouseup event
function onMouseUp() {
    if (dragging) {
        dragging = false;
        dragIndex = -1;
        activeCanvas = null;
    }
}

canvasTop.addEventListener('mousedown', onMouseDown);
canvasTop.addEventListener('mousemove', onMouseMove);
canvasTop.addEventListener('mouseup', onMouseUp);
canvasTop.addEventListener('mouseout', onMouseUp);

canvasFront.addEventListener('mousedown', onMouseDown);
canvasFront.addEventListener('mousemove', onMouseMove);
canvasFront.addEventListener('mouseup', onMouseUp);
canvasFront.addEventListener('mouseout', onMouseUp);

drawVisualizationTop();
drawVisualizationFront();
/*--------------------Canvas Display of Sound Source Positions--------------------*/



/*--------------------Rotate Listener Orientation--------------------*/
// Add event listeners for keydown and keyup
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

function handleKeyDown(event) {
    if (event.key === 'ArrowLeft') {
        isRotatingLeft = true;
        console.log('Rotating left');
    } else if (event.key === 'ArrowRight') {
        isRotatingRight = true;
        console.log('Rotating right');
    }
}

function handleKeyUp(event) {
    if (event.key === 'ArrowLeft') {
        isRotatingLeft = false;
    } else if (event.key === 'ArrowRight') {
        isRotatingRight = false;
    }
}

// Add this function to update the listener's orientation
function updateListenerOrientation() {
    if (isRotatingLeft) {
        listenerRotation -= rotationSpeed;
    } else if (isRotatingRight) {
        listenerRotation += rotationSpeed;
    }

    // Normalize rotation to be between 0 and 360 degrees
    listenerRotation = (listenerRotation + 360) % 360;

    // Convert rotation to radians
    const rotationRad = listenerRotation * Math.PI / 180;

    // Update listener's orientation
    listener.forwardX.value = Math.sin(rotationRad);
    listener.forwardZ.value = -Math.cos(rotationRad);

    // Redraw the visualizations
    drawVisualizationTop();
    drawVisualizationFront();
}

function animate() {
    updateListenerOrientation();
    requestAnimationFrame(animate);
}

// Start the animation loop
animate();
/*--------------------Rotate Listener Orientation--------------------*/



/*--------------------Header Buttons--------------------*/
// Toggle button for footer display and Live Mix/Listen & Watch
// Handle toggleFooterDisplay
const toggleFooterDisplay = document.getElementById('toggleFooterDisplay');
const footerOptions = toggleFooterDisplay.querySelectorAll('.mode-option');
const footerElement = document.querySelector('footer'); // Assuming <footer> is the element to show/hide

footerOptions.forEach(option => {
    option.addEventListener('click', () => {
        const mode = option.dataset.mode;

        // Remove 'active' class from all options
        footerOptions.forEach(opt => opt.classList.remove('footer-active'));
        // Add 'active' class to the selected option
        option.classList.add('footer-active');

        // Calculate the width and transform for the highlight
        const width = option.offsetWidth;
        const transform = option.offsetLeft - 2; // Adjust for padding if necessary

        // Set the CSS custom properties
        toggleFooterDisplay.style.setProperty('--highlight-width', `${width}px`);
        toggleFooterDisplay.style.setProperty('--highlight-transform', `${transform}px`);

        footerDefaultDisplay = !footerDefaultDisplay;

        if (mode === 'on') {
            // Show preset controls and adjust progress container
            presetControls.style.display = 'flex';
            presetControls.style.flex = '0 0 105px';
            progressContainer.style.flex = '0 0 45px';
            contentColumn.style.flexDirection = 'column';

            // Ensure the footer is visible
            footerElement.style.display = 'block';
        } else if (mode === 'off') {
            // Hide preset controls and expand progress container
            presetControls.style.display = 'none';
            presetControls.style.flex = '0';
            progressContainer.style.flex = '1';
            contentColumn.style.flexDirection = 'column';

            // Re-apply current preset to ensure synchronization
            if (currentTimeStampPresetIndex >= 0) {
                document.querySelectorAll('.preset-btn')[currentTimeStampPresetIndex].click();
            }

            // Hide the footer
            footerElement.style.display = 'none';
        }

        // Redraw the timeline to fit the new container size and update playhead
        if (overviewTimeline) {
            overviewTimeline.resize();
            overviewTimeline.updatePlayhead(audioElementPremiere.currentTime);
        }
    });
});

// Initialize the highlight for the default active option
const defaultActiveFooterOption = toggleFooterDisplay.querySelector('.mode-option.footer-active');
if (defaultActiveFooterOption) {
    // Calculate the initial highlight position and width
    const width = defaultActiveFooterOption.offsetWidth;
    const transform = defaultActiveFooterOption.offsetLeft - 2; // Adjust for padding if necessary

    toggleFooterDisplay.style.setProperty('--highlight-width', `${width}px`);
    toggleFooterDisplay.style.setProperty('--highlight-transform', `${transform}px`);

    // Simulate a click to set up the initial state
    defaultActiveFooterOption.click();
}

// Toggle button for content display and Score/Tech Guide
document.getElementById('toggleContentDisplay').addEventListener('click', function(event) {
    if (event.target.classList.contains('mode-option')) {
        const mode = event.target.dataset.mode;
        const scrollContainer = document.querySelector('.scroll-container');
        const technicalGuideContainer = document.querySelector('.technical-guide-container');
        const technicalGuide = document.getElementById('technical-guide');
        const synthesiaContainer = document.getElementById('synthesia-container');
        const videoContainer = document.getElementById('videoContainer');

        // Remove active class from all options
        document.querySelectorAll('.mode-option').forEach(option => option.classList.remove('active'));
        // Add active class to clicked option
        event.target.classList.add('active');

        if (mode === 'score') {
            contentMode = 'score';
            scrollContainer.style.display = 'block';
            technicalGuideContainer.style.display = 'none';
            technicalGuide.style.display = 'none';
            synthesiaContainer.style.display = 'none';
            videoContainer.style.display = 'none';
            if (synthesiaDisplay) {
                synthesiaDisplay.stop();
            }
        } else if (mode === 'techGuide') {
            contentMode = 'techGuide';
            scrollContainer.style.display = 'none';
            technicalGuideContainer.style.display = 'flex';
            technicalGuide.style.display = 'block';
            synthesiaContainer.style.display = 'none';
            videoContainer.style.display = 'none';
            if (synthesiaDisplay) {
                synthesiaDisplay.stop();
            }
            scrollToHighlightedRow();
        } else if (mode === 'synthesia') {
            contentMode = 'synthesia';
            scrollContainer.style.display = 'none';
            technicalGuideContainer.style.display = 'none';
            technicalGuide.style.display = 'none';
            synthesiaContainer.style.display = 'block';
            videoContainer.style.display = 'none';
            initSynthesiaDisplay();
        } else if (mode === 'video') {
            contentMode = 'video';
            scrollContainer.style.display = 'none';
            technicalGuideContainer.style.display = 'none';
            technicalGuide.style.display = 'none';
            synthesiaContainer.style.display = 'none';
            videoContainer.style.display = 'block';
            if (synthesiaDisplay) {
                synthesiaDisplay.stop();
            }
        }
    }
});

// Help Button
const helpButton = document.getElementById('helpButton');
const helpPopup = document.getElementById('helpPopup');
const closeBtn = document.querySelector('.close-btn');

helpButton.addEventListener('click', () => {
    helpPopup.style.display = 'block';
});

closeBtn.addEventListener('click', () => {
    helpPopup.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target == helpPopup) {
        helpPopup.style.display = 'none';
    }
});

// Reset orientation button
const resetOrientationButton = document.getElementById('resetOrientationButton');

// Add click event listener to the reset orientation button
resetOrientationButton.addEventListener('click', resetListenerOrientation);

// Function to reset listener orientation
function resetListenerOrientation() {
    // Reset the rotation angle
    listenerRotation = 0;

    // Reset listener's orientation
    listener.forwardX.value = 0;
    listener.forwardY.value = 0;
    listener.forwardZ.value = -1;

    // Redraw the visualizations
    drawVisualizationTop();
    drawVisualizationFront();
}
/*--------------------Header Buttons--------------------*/

document.addEventListener('DOMContentLoaded', function() {
    const keywordPanel = new KeywordPanel();

    // Define keywords
    const keywords = [
        { word: 'ZIG-ZAG', definition: 'A mix pattern to quickly move the sound between different speakers in unexpected ways' },
        { word: 'CUE', definition: 'A specific point in the composition where a change or action occurs' },
        { word: 'DENSITY-VARIATION', definition: 'The alteration in the thickness and spacing of musical textures over time, influencing the perceived complexity and intensity of the sound' },
    ];

    // Function to create clickable keywords
    function createClickableKeyword(word, definition) {
        const keywordElement = document.createElement('span');
        keywordElement.classList.add('keyword');
        keywordElement.textContent = word;
        keywordElement.addEventListener('click', () => {
            keywordPanel.openKeywordPanel(word, definition);
        });
        return keywordElement;
    }

    // Find all elements with class 'keyword' in the technical guide
    const technicalGuide = document.getElementById('technical-guide');
    const keywordElements = technicalGuide.querySelectorAll('.keyword');

    // Replace each keyword element with a clickable version
    keywordElements.forEach(element => {
        const word = element.getAttribute('data-word');
        const keywordData = keywords.find(k => k.word === word);
        if (keywordData) {
            const clickableKeyword = createClickableKeyword(keywordData.word, keywordData.definition);
            element.parentNode.replaceChild(clickableKeyword, element);
        }
    });
});

const toggleButton = document.getElementById('toggleContentDisplay');
const options = toggleButton.querySelectorAll('.mode-option');

options.forEach((option, index) => {
    option.addEventListener('click', () => {
        // Remove active class from all options
        options.forEach(opt => opt.classList.remove('active'));

        // Add active class to clicked option
        option.classList.add('active');

        // Calculate the width and transform for the highlight
        const width = option.offsetWidth;
        const transform = option.offsetLeft - 2; // 2px for the padding

        // Set the CSS custom properties
        toggleButton.style.setProperty('--highlight-width', `${width}px`);
        toggleButton.style.setProperty('--highlight-transform', `${transform}px`);
    });
});

// Initialize the highlight for the default active option
const defaultActive = toggleButton.querySelector('.mode-option.active');
if (defaultActive) {
    defaultActive.click();
}

let synthesiaDisplay;
let contentMode = 'score'; // 'score', 'techGuide', or 'synthesia'

function initSynthesiaDisplay() {
    const synthesiaContainer = document.getElementById('synthesia-container');
    if (!synthesiaDisplay) {
        synthesiaDisplay = new SynthesiaDisplay(synthesiaContainer, timestamps, presets);
    }

    // Ensure the container is visible
    synthesiaContainer.style.display = 'block';

    // Adjust the size of the falling notes area
    const fallingNotesArea = synthesiaContainer.querySelector('#falling-notes-area');
    fallingNotesArea.style.height = `${synthesiaContainer.clientHeight - 60}px`; // 60px is the height of the speaker keys

    // Start or stop the animation based on audio playback
    if (audioElementPremiere.paused) {
        synthesiaDisplay.pause();
    } else {
        synthesiaDisplay.play(audioElementPremiere.currentTime);
    }
}

// Help window navigation
document.addEventListener('DOMContentLoaded', () => {
    const helpButton = document.getElementById('helpButton');
    const helpPopup = document.getElementById('helpPopup');
    const closeBtn = helpPopup.querySelector('.close-btn');
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const helpPages = document.querySelectorAll('.help-page');
    const pageIndicators = helpPopup.querySelector('.page-indicators');

    let currentPage = 1;
    const totalPages = helpPages.length;

    function createPageIndicators() {
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('div');
            dot.classList.add('page-dot');
            dot.addEventListener('click', () => showPage(i + 1));
            pageIndicators.appendChild(dot);
        }
    }

    function showPage(pageNumber) {
        helpPages.forEach((page, index) => {
            page.classList.remove('active');
            pageIndicators.children[index].classList.remove('active');
            if (parseInt(page.dataset.page) === pageNumber) {
                page.classList.add('active');
                pageIndicators.children[index].classList.add('active');
            }
        });
        currentPage = pageNumber;
        updateNavButtons();
    }

    function nextPage() {
        if (currentPage < totalPages) {
            showPage(currentPage + 1);
        }
    }

    function prevPage() {
        if (currentPage > 1) {
            showPage(currentPage - 1);
        }
    }

    function updateNavButtons() {
        prevPageBtn.disabled = currentPage === 1;
        nextPageBtn.disabled = currentPage === totalPages;
        prevPageBtn.style.visibility = currentPage === 1 ? 'hidden' : 'visible';
        nextPageBtn.style.visibility = currentPage === totalPages ? 'hidden' : 'visible';
    }

    helpButton.addEventListener('click', () => {
        helpPopup.style.display = 'block';
        showPage(1);
    });

    closeBtn.addEventListener('click', () => {
        helpPopup.style.display = 'none';
    });

    nextPageBtn.addEventListener('click', nextPage);
    prevPageBtn.addEventListener('click', prevPage);

    // Add keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (helpPopup.style.display === 'block') {
            if (e.key === 'ArrowRight') {
                nextPage();
            } else if (e.key === 'ArrowLeft') {
                prevPage();
            } else if (e.key === 'Escape') {
                helpPopup.style.display = 'none';
            }
        }
    });

    createPageIndicators();
    showPage(1);
});