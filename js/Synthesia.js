export default class SynthesiaDisplay {
    constructor(container, timestamps, presets) {
        this.container = container;
        this.fallingNotesArea = container.querySelector('#falling-notes-area');
        this.speakerKeys = container.querySelectorAll('.speaker-key');
        this.timestamps = timestamps;
        this.presets = presets;
        this.currentIndex = 0;
        this.isPlaying = false;
        this.startTime = 0;
        this.pauseTime = 0;
        this.animationFrameId = null;
        this.fallDuration = 2; // Time in seconds for a note to fall from top to bottom
        this.extraNoteHeight = 5; // Extra height in pixels for each note
        this.userInput = new Set(); // Track user input
        this.initEventListeners();
    }

    initEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    handleKeyDown(event) {
        if (event.key >= '1' && event.key <= '6') {
            const index = parseInt(event.key) - 1;
            this.userInput.add(index);
            this.speakerKeys[index].classList.add('active');
        }
    }

    handleKeyUp(event) {
        if (event.key >= '1' && event.key <= '6') {
            const index = parseInt(event.key) - 1;
            this.userInput.delete(index);
            this.speakerKeys[index].classList.remove('active');
        }
    }

    play(currentTime = 0) {
        this.isPlaying = true;
        this.seek(currentTime);
        this.animate();
    }

    pause() {
        this.isPlaying = false;
        this.pauseTime = performance.now();
        cancelAnimationFrame(this.animationFrameId);
    }

    resume(currentTime) {
        if (!this.isPlaying) {
            this.play(currentTime);
        }
    }

    stop() {
        this.isPlaying = false;
        this.currentIndex = 0;
        cancelAnimationFrame(this.animationFrameId);
        this.clearNotes();
    }

    seek(currentTime) {
        this.clearNotes();
        this.startTime = performance.now() - currentTime * 1000;
        this.currentIndex = this.timestamps.findIndex(timestamp => timestamp > currentTime);
        if (this.currentIndex === -1) this.currentIndex = this.timestamps.length;
        
        // Create notes for all visible events
        for (let i = 0; i < this.timestamps.length; i++) {
            if (this.timestamps[i] + this.getNoteDuration(i) > currentTime - this.fallDuration && this.timestamps[i] <= currentTime + this.fallDuration) {
                this.createFallingNotes(i, currentTime);
            }
        }
        
        this.updateFallingNotes(currentTime);
    }

    clearNotes() {
        while (this.fallingNotesArea.firstChild) {
            this.fallingNotesArea.removeChild(this.fallingNotesArea.firstChild);
        }
        this.speakerKeys.forEach(key => {
            key.classList.remove('active', 'correct', 'incorrect');
            key.style.backgroundColor = '';
        });
    }

    animate() {
        if (!this.isPlaying) return;

        const currentTime = (performance.now() - this.startTime) / 1000;
        
        while (this.currentIndex < this.timestamps.length && currentTime + this.fallDuration >= this.timestamps[this.currentIndex]) {
            this.createFallingNotes(this.currentIndex, currentTime);
            this.currentIndex++;
        }

        this.updateFallingNotes(currentTime);
        this.animationFrameId = requestAnimationFrame(() => this.animate());
    }

    createFallingNotes(index, currentTime) {
        const preset = this.presets[index];
        preset.forEach((isActive, speakerIndex) => {
            if (isActive) {
                this.createFallingNote(index, speakerIndex, currentTime);
            }
        });
    }

    createFallingNote(index, speakerIndex, currentTime) {
        const note = document.createElement('div');
        note.className = 'falling-note';
        note.dataset.index = index;
        note.dataset.speakerIndex = speakerIndex;

        const left = speakerIndex * (100 / 6) + '%';
        note.style.left = left;

        const noteTimestamp = this.timestamps[index];
        const noteDuration = this.getNoteDuration(index);
        const containerHeight = this.fallingNotesArea.clientHeight;

        // Calculate the base height based on the note duration
        const baseNoteHeight = (noteDuration / this.fallDuration) * containerHeight;
        // Add extra height to the note
        const totalNoteHeight = baseNoteHeight + this.extraNoteHeight;
        note.style.height = `${totalNoteHeight}px`;

        // Store the base height as a data attribute for later use
        note.dataset.baseHeight = baseNoteHeight;

        // Calculate the initial top position
        const timeToFall = Math.max(0, noteTimestamp - currentTime);
        const initialTop = -totalNoteHeight + (timeToFall / this.fallDuration) * containerHeight;
        note.style.top = `${initialTop}px`;

        this.fallingNotesArea.appendChild(note);
    }

    updateFallingNotes(currentTime) {
        const notes = this.fallingNotesArea.children;
        const containerHeight = this.fallingNotesArea.clientHeight;
    
        // Reset all keys to default state, but keep the 'active' class if present
        this.speakerKeys.forEach(key => {
            key.classList.remove('correct', 'incorrect');
            if (!key.classList.contains('active')) {
                key.style.backgroundColor = '';
            }
        });
    
        const activeNotes = new Set();
    
        for (let i = notes.length - 1; i >= 0; i--) {
            const note = notes[i];
            const index = parseInt(note.dataset.index);
            const speakerIndex = parseInt(note.dataset.speakerIndex);
            const noteTimestamp = this.timestamps[index];
            const baseHeight = parseFloat(note.dataset.baseHeight);

            const progress = (currentTime - (noteTimestamp - this.fallDuration)) / this.fallDuration;
            const top = progress * containerHeight - parseFloat(note.style.height);

            if (top > containerHeight) {
                note.remove();
            } else {
                note.style.top = `${top}px`;
                const noteBottom = top + baseHeight + this.extraNoteHeight;
                if (noteBottom >= containerHeight && currentTime >= noteTimestamp) {
                    activeNotes.add(speakerIndex);
                }
            }
        }
    
        // Check user input against active notes
        for (let i = 0; i < 6; i++) {
            const key = this.speakerKeys[i];
            const isKeyPressed = this.userInput.has(i);
            const shouldBePressed = activeNotes.has(i);
    
            if ((shouldBePressed && isKeyPressed) || (!shouldBePressed && !isKeyPressed)) {
                // Correct: Key is pressed when it should be, or not pressed when it shouldn't be
                key.classList.add('correct');
                key.style.backgroundColor = 'rgb(0,200,0)'; // Green for correct input
            } else {
                // Incorrect: Key is pressed when it shouldn't be, or not pressed when it should be
                key.classList.add('incorrect');
                key.style.backgroundColor = '#e74c3c'; // Red for incorrect input
            }
        }
    }

    getNoteDuration(index) {
        return (this.timestamps[index + 1] || this.timestamps[index] + 2) - this.timestamps[index];
    }
}