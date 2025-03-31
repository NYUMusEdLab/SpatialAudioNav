class OverviewTimeline {
    constructor(container, timestamps, duration) {
        this.container = container;
        this.timestamps = timestamps;
        this.duration = duration;
        this.playhead = null;
        this.currentTime = 0;
        this.init();
    }

    init() {
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        this.container.style.height = '100%';
        this.container.style.backgroundColor = '#f2f2f2';
        this.container.style.overflow = 'hidden';

        this.createSections();
        this.createPlayhead();
    }

    resize() {
        const currentTime = this.currentTime;
        // Clear the container
        this.container.innerHTML = '';
        
        // Reinitialize the timeline
        this.init();
        
        // Update the playhead position
        this.updatePlayhead(currentTime);

        // Adjust the section names position based on the new height
        this.adjustSectionNamesPosition();
    }

    adjustSectionNamesPosition() {
        const sectionNames = this.container.querySelectorAll('.sectionName');
        const containerHeight = this.container.offsetHeight;
        sectionNames.forEach(name => {
            name.style.top = `${containerHeight / 2}px`;
            name.style.transform = 'translateY(-50%)';
        });
    }

    updatePlayhead(currentTime) {
        this.currentTime = currentTime; // Store the current time
        const position = (currentTime / this.duration) * 100;
        if (this.playhead) {
            this.playhead.style.width = `${position}%`;
        }
    }

    createSections() {
        this.timestamps.forEach((timestamp, index) => {
            const section = document.createElement('div');
            section.classList.add('structureblock');
            section.style.position = 'absolute';
            section.style.height = '100%';
            section.style.left = `${(timestamp / this.duration) * 100}%`;
            
            if (index < this.timestamps.length - 1) {
                section.style.width = `${((this.timestamps[index + 1] - timestamp) / this.duration) * 100}%`;
            } else {
                section.style.width = `${((this.duration - timestamp) / this.duration) * 100}%`;
            }
            
            section.style.backgroundColor = '#f2f2f2';
            section.style.borderRight = '1px solid #ffffff';
            section.style.boxSizing = 'border-box';

            const number = document.createElement('div');
            number.classList.add('sectionName');
            number.textContent = index + 1;
            number.style.position = 'absolute';
            number.style.top = '50%';
            number.style.left = '0';
            number.style.padding = '0 1px';
            number.style.transform = 'translateY(-50%)';
            number.style.fontSize = '10px';
            number.style.color = '#333333';

            section.appendChild(number);
            this.container.appendChild(section);
        });

        if (this.container.firstChild) {
            this.container.firstChild.id = 'overviewtimeline-intro';
        }
        if (this.container.lastChild) {
            this.container.lastChild.id = 'overviewtimeline-outro';
        }
    }

    createPlayhead() {
        this.playhead = document.createElement('div');
        this.playhead.classList.add('timeline-playhead');
        this.playhead.style.position = 'absolute';
        this.playhead.style.height = '100%';
        this.playhead.style.width = '0';
        this.playhead.style.top = '0';
        this.playhead.style.left = '0';
        this.playhead.style.backgroundColor = '#ffddc3';
        this.playhead.style.borderRight = '4px solid #f78d3c';
        this.playhead.style.boxSizing = 'border-box';
        this.playhead.style.zIndex = '10';
        this.container.appendChild(this.playhead);
    }

    updatePlayhead(currentTime) {
        const position = (currentTime / this.duration) * 100;
        this.playhead.style.width = `${position}%`;
    }

    addClickListener(callback) {
        this.container.addEventListener('click', (event) => {
            const rect = this.container.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const clickedTime = (x / rect.width) * this.duration;
            this.updatePlayhead(clickedTime);
            callback(clickedTime);
        });
    }
}

export default OverviewTimeline;