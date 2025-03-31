class KeywordPanel {
    constructor() {
        this.technicalGuideContainer = document.querySelector('.technical-guide-container');
        this.technicalGuide = document.getElementById('technical-guide');
        this.keywordPanel = document.getElementById('keyword');
        this.closeBtn = this.keywordPanel.querySelector('.close-btn');
        this.keywordTitle = this.keywordPanel.querySelector('.keyword-title');
        this.keywordDefinition = this.keywordPanel.querySelector('.keyword-definition p');
        this.freshIdeasContent = this.keywordPanel.querySelector('.idea-content p');
        this.refreshBtn = this.keywordPanel.querySelector('.refresh-btn');
        
        this.initEventListeners();
    }

    initEventListeners() {
        this.closeBtn.addEventListener('click', () => this.closeKeywordPanel());
        this.refreshBtn.addEventListener('click', () => this.refreshFreshIdea());
        document.getElementById('toggleContentDisplay').addEventListener('click', () => this.handleContentToggle());
    }

    openKeywordPanel(keyword, definition) {
        this.keywordTitle.textContent = keyword;
        this.keywordDefinition.textContent = definition;
        this.refreshFreshIdea();
        this.keywordPanel.style.display = 'block';
        this.technicalGuideContainer.classList.add('keyword-open');
    }

    closeKeywordPanel() {
        this.keywordPanel.style.display = 'none';
        this.technicalGuideContainer.classList.remove('keyword-open');
    }

    handleContentToggle() {
        if (document.getElementById('toggleContentDisplay').textContent === 'Score') {
            this.closeKeywordPanel();
        }
    }

    refreshFreshIdea() {
        const ideas = [
            "Try rapid panning between speakers",
            "Experiment with different speaker configurations",
            "Listen to the sounds source differences between zig-zag patterns",
            "Listen to the volume differences between zig-zag patterns"
        ];
        this.freshIdeasContent.textContent = ideas[Math.floor(Math.random() * ideas.length)];
    }
}

export default KeywordPanel;