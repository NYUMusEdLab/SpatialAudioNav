/**
 * Audio Visualizer that shows music phrases and speaker activity
 */

class AudioVisualizer {
    constructor() {
        // Canvas and drawing context for waveform visualization
        this.waveformCanvas = document.getElementById('waveform-canvas');
        this.waveformCtx = this.waveformCanvas ? this.waveformCanvas.getContext('2d') : null;
        
        // Audio elements
        this.audioElement = document.getElementById('double');
        this.audioContext = window.audioCtx;
        this.audioData = null;
        this.audioBuffer = null;
        this.analyser = null;
        this.dataArray = null;

        // Speaker visualization elements
        this.speakerLanesElement = document.querySelector('.speaker-lanes');
        this.speakerLanes = [];
        this.phraseMarkersElement = document.querySelector('.phrase-markers');
        this.playhead = document.querySelector('.playhead');
        
        // MUSICAL PHRASE TIMING DEFINITIONS (HARDCODED)
        // Sample phrase data for waveform visualization - these are separate from
        // the main speaker pattern timings defined in script.js timestampPatterns
        // These timing values are for visual phrase analysis only
        this.phrases = [
            { start: 0, end: 4.2, type: 'opening' },        // 0-4.2 seconds
            { start: 4.2, end: 8.5, type: 'development' },  // 4.2-8.5 seconds  
            { start: 8.5, end: 12.3, type: 'transition' },  // 8.5-12.3 seconds
            { start: 12.3, end: 16.7, type: 'closing' },    // 12.3-16.7 seconds
            // Add more phrases based on the actual music analysis
        ];
        
        // Initialize
        this.init();
    }
    
    async init() {
        try {
            // Set up the canvas
            this.setupCanvas();
            
            // Create speaker lanes UI
            this.createSpeakerLanes();
            
            // Set up audio analyzer
            await this.setupAudioAnalyzer();
            
            // Add phrase markers
            this.addPhraseMarkers();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start the visualization loop
            this.animate();
        } catch (error) {
            console.error('Error initializing audio visualizer:', error);
        }
    }
    
    setupCanvas() {
        if (!this.waveformCanvas) return;
        
        const rect = this.waveformCanvas.getBoundingClientRect();
        this.waveformCanvas.width = rect.width * window.devicePixelRatio;
        this.waveformCanvas.height = rect.height * window.devicePixelRatio;
    }
    
    async setupAudioAnalyzer() {
        if (!this.audioContext) return;
        
        // Create analyzer node
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(bufferLength);
        
        // Connect analyzer to existing audio setup
        // We'll tap into the audio stream without disrupting existing connections
        if (window.gainNodes && window.gainNodes.length) {
            const splitter = this.audioContext.createChannelSplitter(2);
            window.gainNodes[0].connect(splitter);
            splitter.connect(this.analyser);
        }
        
        // Also fetch audio data for the waveform display
        try {
            const response = await fetch(this.audioElement.src);
            const arrayBuffer = await response.arrayBuffer();
            this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            
            // Process the buffer to get a summarized waveform
            this.processAudioBuffer();
        } catch (error) {
            console.error('Error loading audio data:', error);
        }
    }
    
    processAudioBuffer() {
        if (!this.audioBuffer || !this.waveformCanvas) return;
        
        const channelData = this.audioBuffer.getChannelData(0); // Use the first channel
        const width = this.waveformCanvas.width;
        
        // Create a summarized version for drawing
        const blockSize = Math.floor(channelData.length / width);
        const summary = [];
        
        for (let i = 0; i < width; i++) {
            const blockStart = i * blockSize;
            let blockSum = 0;
            for (let j = 0; j < blockSize; j++) {
                if (blockStart + j < channelData.length) {
                    blockSum += Math.abs(channelData[blockStart + j]);
                }
            }
            summary.push(blockSum / blockSize);
        }
        
        this.audioData = summary;
        this.drawWaveform();
    }
    
    drawWaveform() {
        if (!this.audioData || !this.waveformCtx || !this.waveformCanvas) return;
        
        const ctx = this.waveformCtx;
        const { width, height } = this.waveformCanvas;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Set up drawing style
        ctx.strokeStyle = '#e69138';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        // Draw the mid-line (zero amplitude)
        const midPoint = height / 2;
        
        // Draw the waveform
        const barWidth = width / this.audioData.length;
        
        for (let i = 0; i < this.audioData.length; i++) {
            const amplitude = this.audioData[i] * height * 2; // Scale for visibility
            ctx.fillStyle = `rgba(230, 145, 56, ${0.5 + this.audioData[i]})`;
            ctx.fillRect(i * barWidth, midPoint - amplitude / 2, barWidth, amplitude);
        }
        
        ctx.stroke();
        
        // Add grid lines for reference
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.lineWidth = 0.5;
        
        // Horizontal grid
        for (let i = 0; i <= 4; i++) {
            const y = (i / 4) * height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // Vertical grid every second
        const secondWidth = width / (this.audioBuffer ? this.audioBuffer.duration : 60);
        for (let i = 0; i <= this.audioBuffer.duration; i++) {
            const x = i * secondWidth;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
    }
    
    createSpeakerLanes() {
        if (!this.speakerLanesElement) return;
        
        // Clear existing lanes
        this.speakerLanesElement.innerHTML = '';
        this.speakerLanes = [];
        
        // Define speaker-to-gain-node mapping that matches the 2D visualization
        const speakerGainMapping = [
            { label: 1, gainNode: 4 }, // Speaker 1 uses gain node 4
            { label: 2, gainNode: 3 }, // Speaker 2 uses gain node 3
            { label: 3, gainNode: 2 }, // Speaker 3 uses gain node 2
            { label: 4, gainNode: 1 }, // Speaker 4 uses gain node 1
            { label: 5, gainNode: 0 }, // Speaker 5 uses gain node 0
            { label: 6, gainNode: 5 }  // Speaker 6 uses gain node 5
        ];
        
        // Create lanes with the correct mapping
        speakerGainMapping.forEach(speaker => {
            const lane = document.createElement('div');
            lane.classList.add('speaker-lane');
            
            // Display the speaker number
            lane.innerHTML = `<span class="speaker-number">${speaker.label}</span>`;
            
            // Use the mapped gain node index
            lane.dataset.gainNodeIndex = speaker.gainNode;
            
            // Add the lane to both the DOM and our array
            this.speakerLanesElement.appendChild(lane);
            this.speakerLanes.push(lane);
        });
    }
    
    addPhraseMarkers() {
        if (!this.phraseMarkersElement || !this.audioBuffer) return;
        
        // Clear existing markers
        this.phraseMarkersElement.innerHTML = '';
        
        const duration = this.audioBuffer.duration;
        const containerWidth = this.phraseMarkersElement.offsetWidth;
        
        // Add markers for each phrase
        this.phrases.forEach(phrase => {
            // Start marker
            const startMarker = document.createElement('div');
            startMarker.classList.add('phrase-marker', 'phrase-start');
            startMarker.style.left = `${(phrase.start / duration) * 100}%`;
            startMarker.title = `${phrase.type} start at ${phrase.start.toFixed(1)}s`;
            this.phraseMarkersElement.appendChild(startMarker);
            
            // End marker
            const endMarker = document.createElement('div');
            endMarker.classList.add('phrase-marker', 'phrase-end');
            endMarker.style.left = `${(phrase.end / duration) * 100}%`;
            endMarker.title = `${phrase.type} end at ${phrase.end.toFixed(1)}s`;
            this.phraseMarkersElement.appendChild(endMarker);
        });
    }
    
    updateSpeakerActivity() {
        // Get current speaker activity from gain nodes
        if (!window.gainNodes || !this.speakerLanes.length) return;
        
        // Get current time position as percentage of duration
        const currentTime = this.audioElement.currentTime;
        const duration = this.audioBuffer ? this.audioBuffer.duration : 60;
        const position = (currentTime / duration) * 100;
        
        // Update playhead position
        if (this.playhead) {
            this.playhead.style.left = `${position}%`;
        }
        
        // Update each speaker lane to show activity
        this.speakerLanes.forEach((lane, index) => {
            // Get the correct gain node index from the lane's data attribute
            const gainNodeIndex = parseInt(lane.dataset.gainNodeIndex);
            if (gainNodeIndex >= window.gainNodes.length) return;
            
            const gain = window.gainNodes[gainNodeIndex].gain.value;
            
            // Update the lane's appearance based on activity
            if (gain > 0.1) {
                lane.style.backgroundColor = 'rgba(255, 149, 0, 0.3)';
            } else {
                lane.style.backgroundColor = 'rgba(100, 100, 100, 0.3)';
            }
            
            // Show activity for this point in time
            const activity = document.createElement('div');
            activity.classList.add('speaker-activity');
            activity.style.left = `${position}%`;
            activity.style.width = '3px'; // slightly wider line for better visibility
            
            // Color intensity based on gain
            activity.style.opacity = gain > 0.1 ? 1 : 0.2; // More contrast
            activity.style.backgroundColor = gain > 0.1 ? '#ff9500' : 'rgba(230, 145, 56, 0.7)';
            
            lane.appendChild(activity);
            
            // Clean up old activity markers to avoid memory leaks
            if (lane.childElementCount > 200) {
                lane.removeChild(lane.firstChild);
            }
        });
        
        // Check if we're currently within any phrase and highlight it
        if (this.phrases && this.phrases.length > 0) {
            const currentActivePhrase = this.phrases.find(phrase => 
                currentTime >= phrase.start && currentTime <= phrase.end
            );
            
            // Remove any existing highlights
            document.querySelectorAll('.phrase-marker-active').forEach(marker => {
                marker.classList.remove('phrase-marker-active');
            });
            
            // Add highlight to current phrase markers
            if (currentActivePhrase) {
                document.querySelectorAll('.phrase-marker').forEach(marker => {
                    const markerTime = parseFloat(marker.title.match(/\d+\.\d+/)[0]);
                    if (markerTime === currentActivePhrase.start || markerTime === currentActivePhrase.end) {
                        marker.classList.add('phrase-marker-active');
                    }
                });
            }
        }
    }
    
    setupEventListeners() {
        const scrubber = document.querySelector('.timeline-scrubber');
        if (scrubber) {
            scrubber.addEventListener('click', this.onScrubberClick.bind(this));
        }
        
        // Add button listeners
        const toggleWaveform = document.getElementById('toggleWaveform');
        if (toggleWaveform) {
            toggleWaveform.addEventListener('click', () => {
                toggleWaveform.classList.toggle('active');
                if (this.waveformCanvas) {
                    this.waveformCanvas.style.display = 
                        this.waveformCanvas.style.display === 'none' ? 'block' : 'none';
                }
            });
        }
        
        const toggleSpeakers = document.getElementById('toggleSpeakers');
        if (toggleSpeakers) {
            toggleSpeakers.addEventListener('click', () => {
                toggleSpeakers.classList.toggle('active');
                if (this.speakerLanesElement) {
                    this.speakerLanesElement.style.display = 
                        this.speakerLanesElement.style.display === 'none' ? 'flex' : 'none';
                }
            });
        }
        
        // Handle window resize
        window.addEventListener('resize', this.onResize.bind(this));
    }
    
    onScrubberClick(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const clickPos = (event.clientX - rect.left) / rect.width;
        
        // Set audio to the clicked time
        if (this.audioBuffer && this.audioElement) {
            this.audioElement.currentTime = clickPos * this.audioBuffer.duration;
        }
    }
    
    onResize() {
        this.setupCanvas();
        if (this.audioData) {
            this.drawWaveform();
        }
    }
    
    animate() {
        // Update the visualization
        this.updateSpeakerActivity();
        
        // Request next frame
        requestAnimationFrame(this.animate.bind(this));
    }
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a moment to ensure all required elements are ready
    setTimeout(() => {
        window.audioVisualizer = new AudioVisualizer();
    }, 1000);
});

export default AudioVisualizer;
