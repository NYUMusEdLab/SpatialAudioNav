/**
 * Trivia Sections for the Boulez Project
 * Contains information about the composer, piece, techniques, and history
 */

const triviaContent = {
    // Composer information
    composer: {
        title: "About Pierre Boulez",
        content: `
            <h3>Pierre Boulez (1925-2016)</h3>
            <p>Pierre Boulez was a French composer, conductor, writer, and founder of several musical institutions. He was one of the most influential composers of post-war serialism, particularly known for his use of controlled chance, electronic music, and exploring the spatial dimensions of sound.</p>
            <p>As a conductor, Boulez was known for his performances of 20th-century classics and for promoting contemporary music. He served as music director of the New York Philharmonic, chief conductor of the BBC Symphony Orchestra, and founded IRCAM (Institute for Research and Coordination in Acoustics/Music) in Paris.</p>
            <img src="images/dialogueaiimage.png" alt="Pierre Boulez" />
            <p>Boulez's compositions are characterized by their rigorous structures, innovative orchestration, and complex rhythmic organizations. His approach revolutionized composition techniques in the 20th century and his influence continues in contemporary music today.</p>
        `
    },
    // Information about the specific piece
    piece: {
        title: "About 'Dialogue de l'ombre double'",
        content: `
            <h3>Dialogue de l'ombre double (1985)</h3>
            <p>"Dialogue of the Double Shadow" is a work for clarinet and electronics composed in 1985. The piece explores the relationship between a live performer and their electronically transformed double, creating a spatial dialogue between the two sound sources.</p>
            <p>The work consists of several main sections: an opening 'Sigle initial', followed by six strophes, interspersed with five transitions, and ending with a 'Sigle final'. Throughout the piece, the spatial location of sounds plays a crucial role in the musical experience.</p>
            <p>The title references the play "Le Soulier de satin" by Paul Claudel, which features a dialogue between a character and their shadow, metaphorically represented in Boulez's work as the dialogue between the live clarinet and its electronic double.</p>
            <img src="images/score/boulezdialoguescoretransition3-4.png" alt="Score excerpt" />
            <p>In performance, the audience experiences the sound moving between different speakers arranged in a circle, creating an immersive spatial experience that is integral to the composition.</p>
        `
    },
    // Information about techniques used
    technique: {
        title: "Compositional Techniques",
        content: `
            <h3>Spatial Audio Techniques</h3>
            <p>Boulez pioneered the use of space as a musical parameter. In "Dialogue de l'ombre double", the movement of sound between different speakers is carefully choreographed to create dynamic spatial patterns that complement the musical structure.</p>
            <p>The composition employs several key techniques:</p>
            <ul>
                <li><strong>Spatial Counterpoint:</strong> Creating independent musical lines that move through different spatial locations</li>
                <li><strong>Circular Panning:</strong> Smooth movement of sounds in circular patterns around the audience</li>
                <li><strong>Accelerating Rotations:</strong> Increasing the speed of spatial movement, particularly evident in Transition 3-4</li>
                <li><strong>Wet/Dry Balancing:</strong> In Strophe V, the balance between processed ("wet") and unprocessed ("dry") clarinet sounds creates a unique spatial effect</li>
            </ul>
            <p>The electronic transformations include spectral modifications, time stretching, and resonance filtering that alter the timbre and character of the clarinet sound.</p>
        `
    },
    // Historical context and impact
    history: {
        title: "Historical Context",
        content: `
            <h3>Historical Context and Legacy</h3>
            <p>"Dialogue de l'ombre double" was composed during Boulez's tenure at IRCAM, where he had access to cutting-edge technology for electronic music composition. The piece represents an important milestone in the integration of electronic and acoustic sounds.</p>
            <p>The work was composed for clarinetist Alain Damiens and first performed in 1985 at the Florence Festival. It has since become an important piece in the contemporary clarinet repertoire and a landmark in spatial music composition.</p>
            <p>The piece's innovations in spatial audio have influenced subsequent composers and sound artists who explore the placement and movement of sound as compositional parameters. Its technical requirements also drove developments in speaker array configurations and spatial audio software.</p>
            <img src="images/mixing/circlemix.png" alt="Speaker arrangement" />
            <p>Today, "Dialogue" continues to be performed with updated technology, demonstrating how Boulez's musical ideas transcend specific technological implementations and remain relevant in contemporary performance practice.</p>
        `
    },
    // Section-specific information
    sections: {
        default: {
            title: "Initial Sigle",
            content: `
                <h3>Initial Sigle</h3>
                <p>The opening section of the piece introduces the central musical material. The "Sigle initial" serves as a sonic signature that establishes the relationship between the live clarinet and its electronic double.</p>
                <p>Listen for how the sound moves between different spatial locations, creating a sense of dialogue between distinct points in space.</p>
            `
        },
        "transition1-2": {
            title: "Transition 1-2",
            content: `
                <h3>Transition 1-2</h3>
                <p>This transition moves us from the first strophe to the second, with a focus on spatial movement between paired speakers.</p>
                <p>The electronic sounds begin to create more complex spatial patterns, extending the simple dialogue into a more intricate conversation across the listening space.</p>
                <img src="images/score/transition12.png" alt="Transition 1-2 score" />
            `
        },
        "transition3-4": {
            title: "Transition 3-4",
            content: `
                <h3>Transition 3-4</h3>
                <p>This section features accelerating circular panning, where sounds rotate around the audience with increasing speed.</p>
                <p>The accelerating rotation creates a dramatic effect that transforms the spatial perception of the clarinet sounds, blurring the boundaries between different spatial locations.</p>
                <img src="images/score/transition23.png" alt="Transition 3-4 score" />
            `
        },
        "stropheV": {
            title: "Strophe V",
            content: `
                <h3>Strophe V</h3>
                <p>Strophe V explores the balance between "dry" (unprocessed) and "wet" (processed with resonant filtering) clarinet sounds.</p>
                <p>The resonator effect creates a piano-like resonance that complements the original clarinet timbre, creating rich harmonies and textures that move through the spatial arrangement.</p>
                <img src="images/score/strophe5.png" alt="Strophe V score" />
            `
        }
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