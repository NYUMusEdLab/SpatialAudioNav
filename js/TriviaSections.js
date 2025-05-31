/**
 * Trivia Sections for the Boulez Project - Empty version
 */

const triviaContent = {
    composer: { title: "About Pierre Boulez", content: `` },
    piece: { title: "About 'Dialogue de l'ombre double'", content: `` },
    technique: { title: "Compositional Techniques", content: `` },
    history: { title: "Historical Context", content: `` },
    sections: {
        default: { title: "Initial Sigle", content: `` },
        "transition1-2": { title: "Transition 1-2", content: `` },
        "transition3-4": { title: "Transition 3-4", content: `` },
        "stropheV": { title: "Strophe V", content: `` }
    }
};

// Function to get content for a specific section
function getTriviaContent(section) {
    return triviaContent[section] || triviaContent.piece;
}

// Function to get content for a specific scene
function getSceneTrivia(scene) {
    return triviaContent.sections[scene] || triviaContent.sections.default;
}

// Make functions available globally
window.getTriviaContent = getTriviaContent;
window.getSceneTrivia = getSceneTrivia;