// /**
//  * Melodic Contour Display Component
//  * Visualizes the melodic contour and mix cues for the spatial audio pieces
//  */

// class ContourDisplay {
//     constructor() {
//         this.canvas = document.getElementById('contour-canvas');
//         this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
//         this.audioElement = null;
//         this.currentScene = 'default';
//         this.mixCues = {};
//         this.contourData = {};
//         this.notationPaths = {};
//         this.playheadPosition = 0;
//         this.isPlaying = false;
//         this.animationFrameId = null;
//         this.scrubbing = false;
//         this.loadingImages = false;
        
//         // Scene-specific settings
//         this.initializeSceneData();
        
//         // Initial setup 
//         this.setupEventListeners();
//         this.setupCanvas();
//         this.loadImages();
//     }

//     initializeSceneData() {
//         // Define contour data for different scenes
//         this.contourData = {
//             default: [
//                 { time: 0, value: 0.5 },
//                 { time: 1.483, value: 0.3 },
//                 { time: 3.311, value: 0.7 },
//                 { time: 4.59, value: 0.4 },
//                 { time: 7.863, value: 0.6 },
//                 { time: 11.365, value: 0.2 },
//                 { time: 17.314, value: 0.8 },
//                 { time: 18.926, value: 0.4 },
//                 { time: 23.75, value: 0.5 },
//                 { time: 31.035, value: 0.6 },
//                 { time: 33.334, value: 0.3 },
//                 { time: 36.547, value: 0.7 },
//                 { time: 37.723, value: 0.4 },
//                 { time: 40.114, value: 0.5 },
//                 { time: 41.014, value: 0.2 },
//                 { time: 42.203, value: 0.6 },
//                 { time: 43.957, value: 0.7 },
//                 { time: 45.172, value: 0.5 },
//                 { time: 45.783, value: 0.3 },
//                 { time: 47.39, value: 0.6 },
//                 { time: 48.731, value: 0.4 },
//                 { time: 50.323, value: 0.7 },
//                 { time: 52.462, value: 0.5 },
//                 { time: 55.005, value: 0.8 },
//                 { time: 59.489, value: 0.4 },
//                 { time: 63.377, value: 0.6 },
//                 { time: 68.79, value: 0.3 }
//             ],
//             "transition1-2": [
//                 { time: 0, value: 0.3 },
//                 { time: 1.2, value: 0.5 },
//                 { time: 2.4, value: 0.2 },
//                 { time: 3.6, value: 0.7 },
//                 { time: 4.8, value: 0.4 },
//                 { time: 6.0, value: 0.6 },
//                 { time: 7.2, value: 0.3 },
//                 { time: 8.4, value: 0.5 },
//                 { time: 9.6, value: 0.8 },
//                 { time: 10.8, value: 0.4 }
//             ],
//             "transition3-4": [
//                 { time: 0, value: 0.5 },
//                 { time: 0.8, value: 0.3 },
//                 { time: 1.6, value: 0.7 },
//                 { time: 2.4, value: 0.4 },
//                 { time: 3.2, value: 0.8 },
//                 { time: 4.0, value: 0.5 },
//                 { time: 4.8, value: 0.6 },
//                 { time: 5.6, value: 0.3 },
//                 { time: 6.4, value: 0.9 },
//                 { time: 7.2, value: 0.4 }
//             ],
//             "stropheV": [
//                 { time: 0, value: 0.2 },
//                 { time: 1.0, value: 0.6 },
//                 { time: 2.0, value: 0.3 },
//                 { time: 3.0, value: 0.7 },
//                 { time: 4.0, value: 0.4 },
//                 { time: 5.0, value: 0.8 },
//                 { time: 6.0, value: 0.5 },
//                 { time: 7.0, value: 0.3 },
//                 { time: 8.0, value: 0.6 },
//                 { time: 9.0, value: 0.4 }
//             ]
//         };
        
//         // Define mix cues for different scenes
//         this.mixCues = {
//             default: [
//                 { time: 0, label: "Start", speakerIdx: 0 },
//                 { time: 7.863, label: "Switch to Sp.5", speakerIdx: 4 },
//                 { time: 17.314, label: "Switch to Sp.6", speakerIdx: 5 },
//                 { time: 31.035, label: "Dual Speakers", speakerIdx: [1, 4] },
//                 { time: 48.731, label: "Build to Finale", speakerIdx: [3, 5] }
//             ],
//             "transition1-2": [
//                 { time: 0, label: "Start T1-2", speakerIdx: 0 },
//                 { time: 3.6, label: "Peak", speakerIdx: 2 },
//                 { time: 7.2, label: "Transition", speakerIdx: [1, 4] }
//             ],
//             "transition3-4": [
//                 { time: 0, label: "Start Rotation", speakerIdx: 0 },
//                 { time: 2.4, label: "Accelerate", speakerIdx: [0, 1, 2, 3, 4, 5] },
//                 { time: 5.6, label: "Max Speed", speakerIdx: [0, 1, 2, 3, 4, 5] }
//             ],
//             "stropheV": [
//                 { time: 0, label: "Dry Signal", speakerIdx: 0 },
//                 { time: 3.0, label: "Add Wet", speakerIdx: 3 },
//                 { time: 6.0, label: "Equal Blend", speakerIdx: [0, 3] }
//             ]
//         };
        
//         // Define notation images paths for different scenes
//         this.notationPaths = {
//             default: [
//                 "images/score/boulezscorescrollsigleinitial.png"
//             ],
//             "transition1-2": [
//                 "images/score/transition12.png"
//             ],
//             "transition3-4": [
//                 "images/score/transition23.png",
//                 "images/score/boulezdialoguescoretransition3-4.png"
//             ],
//             "stropheV": [
//                 "images/score/strophe5.png"
//             ]
//         };
//     }

//     setupCanvas() {
//         if (!this.canvas) return;
        
//         // Set canvas dimensions
//         const container = this.canvas.parentElement;
//         this.canvas.width = container.clientWidth * window.devicePixelRatio;
//         this.canvas.height = container.clientHeight * window.devicePixelRatio;
//         this.canvas.style.width = container.clientWidth + 'px';
//         this.canvas.style.height = container.clientHeight + 'px';
        
//         // Draw initial state
//         this.draw();
//     }
    
//     loadImages() {
//         // Load notation images for all scenes
//         this.loadingImages = true;
//         const notationContainer = document.querySelector('.notation-scroll');
//         if (!notationContainer) return;
        
//         // Clear existing images
//         notationContainer.innerHTML = '';
        
//         // Load images for current scene
//         const imagePaths = this.notationPaths[this.currentScene] || [];
//         let loadedCount = 0;
        
//         imagePaths.forEach(path => {
//             const img = new Image();
//             img.onload = () => {
//                 loadedCount++;
//                 if (loadedCount === imagePaths.length) {
//                     this.loadingImages = false;
//                 }
//             };
//             img.onerror = () => {
//                 console.error('Failed to load image:', path);
//                 loadedCount++;
//                 if (loadedCount === imagePaths.length) {
//                     this.loadingImages = false;
//                 }
//             };
//             img.src = path;
//             img.className = 'notation-image';
//             img.alt = 'Score notation';
//             notationContainer.appendChild(img);
//         });
//     }
    
//     setupEventListeners() {
//         // Listen for scene changes
//         const sceneButtons = document.querySelectorAll('.scene-btn');
//         sceneButtons.forEach(btn => {
//             btn.addEventListener('click', () => {
//                 const scene = btn.dataset.scene;
//                 this.setScene(scene);
                
//                 // Update UI
//                 sceneButtons.forEach(b => b.classList.remove('active'));
//                 btn.classList.add('active');
                
//                 // Switch audio source if needed
//                 if (window.audioElement && window.audioElement.paused) {
//                     const wasPlaying = !window.audioElement.paused;
//                     const currentTime = window.audioElement.currentTime;
                    
//                     // Update audio source
//                     window.audioElement.src = `audio/${scene}.mp3`;
//                     window.audioElement.load();
//                     window.audioElement.currentTime = 0;
                    
//                     if (wasPlaying) {
//                         window.audioElement.play().catch(err => console.error('Error playing audio:', err));
//                     }
//                 }
//             });
//         });
        
//         // Listen for view toggle
//         const viewToggleButtons = document.querySelectorAll('.toggle-contour-view button');
//         viewToggleButtons.forEach(btn => {
//             btn.addEventListener('click', () => {
//                 const view = btn.dataset.view;
//                 this.toggleView(view);
                
//                 // Update UI
//                 viewToggleButtons.forEach(b => b.classList.remove('active'));
//                 btn.classList.add('active');
//             });
//         });
        
//         // Listen for window resize
//         window.addEventListener('resize', this.handleResize.bind(this));
        
//         // Listen for canvas click (for scrubbing)
//         if (this.canvas) {
//             this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));
//         }
        
//         // Bind audio element
//         window.addEventListener('DOMContentLoaded', () => {
//             this.audioElement = document.getElementById('double');
//             if (this.audioElement) {
//                 this.audioElement.addEventListener('timeupdate', () => {
//                     if (!this.scrubbing) {
//                         this.playheadPosition = this.audioElement.currentTime;
//                         this.draw();
//                     }
//                 });
                
//                 this.audioElement.addEventListener('play', () => {
//                     this.isPlaying = true;
//                     this.startAnimation();
//                 });
                
//                 this.audioElement.addEventListener('pause', () => {
//                     this.isPlaying = false;
//                     this.stopAnimation();
//                 });
                
//                 window.audioElement = this.audioElement;
//             }
//         });
//     }
    
//     setScene(scene) {
//         this.currentScene = scene;
//         this.loadImages();
//         this.draw();
//     }
    
//     toggleView(view) {
//         const contourDisplay = document.querySelector('.contour-display');
//         const notationDisplay = document.querySelector('.notation-display');
        
//         if (view === 'contour') {
//             contourDisplay.classList.add('active');
//             notationDisplay.classList.remove('active');
//         } else {
//             contourDisplay.classList.remove('active');
//             notationDisplay.classList.add('active');
//         }
//     }
    
//     handleResize() {
//         this.setupCanvas();
//     }
    
//     handleCanvasClick(e) {
//         if (!this.canvas || !this.audioElement) return;
        
//         const rect = this.canvas.getBoundingClientRect();
//         const clickX = e.clientX - rect.left;
//         const canvasWidth = rect.width;
        
//         // Calculate the time based on click position
//         const audioDuration = this.audioElement.duration || 60;
//         const newTime = (clickX / canvasWidth) * audioDuration;
        
//         this.scrubbing = true;
//         this.audioElement.currentTime = newTime;
//         this.playheadPosition = newTime;
//         this.draw();
        
//         // Reset scrubbing flag after a short delay
//         setTimeout(() => {
//             this.scrubbing = false;
//         }, 100);
//     }
    
//     startAnimation() {
//         if (this.animationFrameId) return;
        
//         const animate = () => {
//             this.draw();
//             this.animationFrameId = requestAnimationFrame(animate);
//         };
        
//         this.animationFrameId = requestAnimationFrame(animate);
//     }
    
//     stopAnimation() {
//         if (this.animationFrameId) {
//             cancelAnimationFrame(this.animationFrameId);
//             this.animationFrameId = null;
//         }
//     }
    
//     draw() {
//         if (!this.ctx || !this.canvas) return;
        
//         const ctx = this.ctx;
//         const { width, height } = this.canvas;
        
//         // Clear canvas
//         ctx.clearRect(0, 0, width, height);
        
//         // Draw background grid
//         this.drawGrid(ctx, width, height);
        
//         // Draw contour
//         this.drawContour(ctx, width, height);
        
//         // Draw mix cues
//         this.drawMixCues(ctx, width, height);
        
//         // Draw playhead
//         this.drawPlayhead(ctx, width, height);
//     }
    
//     drawGrid(ctx, width, height) {
//         // Draw horizontal grid lines
//         ctx.strokeStyle = 'rgba(230, 145, 56, 0.2)';
//         ctx.lineWidth = 1;
        
//         const gridRows = 10;
//         for (let i = 0; i <= gridRows; i++) {
//             const y = height * (i / gridRows);
//             ctx.beginPath();
//             ctx.moveTo(0, y);
//             ctx.lineTo(width, y);
//             ctx.stroke();
//         }
        
//         // Draw vertical grid lines based on time markers (every 5 seconds)
//         const audioDuration = this.audioElement ? this.audioElement.duration || 60 : 60;
//         const timeIncrement = 5; // 5 seconds per grid line
        
//         for (let time = 0; time <= audioDuration; time += timeIncrement) {
//             const x = width * (time / audioDuration);
//             ctx.beginPath();
//             ctx.moveTo(x, 0);
//             ctx.lineTo(x, height);
//             ctx.stroke();
            
//             // Add time label
//             ctx.fillStyle = 'rgba(230, 145, 56, 0.7)';
//             ctx.font = '10px Arial';
//             ctx.fillText(`${time}s`, x + 2, height - 5);
//         }
//     }
    
//     drawContour(ctx, width, height) {
//         const data = this.contourData[this.currentScene] || [];
//         if (!data.length) return;
        
//         const audioDuration = this.audioElement ? this.audioElement.duration || 60 : 60;
        
//         // Draw contour line
//         ctx.strokeStyle = '#e69138';
//         ctx.lineWidth = 3;
//         ctx.beginPath();
        
//         data.forEach((point, index) => {
//             const x = width * (point.time / audioDuration);
//             const y = height * (1 - point.value); // Invert Y so higher values go up
            
//             if (index === 0) {
//                 ctx.moveTo(x, y);
//             } else {
//                 ctx.lineTo(x, y);
//             }
//         });
        
//         ctx.stroke();
        
//         // Add contour points
//         data.forEach(point => {
//             const x = width * (point.time / audioDuration);
//             const y = height * (1 - point.value);
            
//             ctx.fillStyle = '#e69138';
//             ctx.beginPath();
//             ctx.arc(x, y, 5, 0, Math.PI * 2);
//             ctx.fill();
//         });
//     }
    
//     drawMixCues(ctx, width, height) {
//         const cues = this.mixCues[this.currentScene] || [];
//         if (!cues.length) return;
        
//         const audioDuration = this.audioElement ? this.audioElement.duration || 60 : 60;
        
//         // Draw mix cue markers
//         cues.forEach(cue => {
//             const x = width * (cue.time / audioDuration);
            
//             // Draw vertical line
//             ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
//             ctx.lineWidth = 2;
//             ctx.setLineDash([5, 3]);
//             ctx.beginPath();
//             ctx.moveTo(x, 0);
//             ctx.lineTo(x, height);
//             ctx.stroke();
//             ctx.setLineDash([]);
            
//             // Draw label background
//             ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
//             const label = cue.label;
//             const textWidth = ctx.measureText(label).width + 10;
//             ctx.fillRect(x - textWidth / 2, 20, textWidth, 20);
            
//             // Draw label text
//             ctx.fillStyle = '#e69138';
//             ctx.font = 'bold 12px Arial';
//             ctx.textAlign = 'center';
//             ctx.fillText(label, x, 35);
            
//             // Draw speaker indicator
//             if (Array.isArray(cue.speakerIdx)) {
//                 // For multiple speakers
//                 const speakerRadius = 12;
//                 const totalWidth = (cue.speakerIdx.length * 2 * speakerRadius);
//                 let startX = x - totalWidth / 2 + speakerRadius;
                
//                 cue.speakerIdx.forEach(idx => {
//                     ctx.fillStyle = '#e69138';
//                     ctx.beginPath();
//                     ctx.arc(startX, height - 25, speakerRadius, 0, Math.PI * 2);
//                     ctx.fill();
                    
//                     ctx.fillStyle = '#000';
//                     ctx.font = 'bold 10px Arial';
//                     ctx.textAlign = 'center';
//                     ctx.fillText((idx + 1).toString(), startX, height - 21);
                    
//                     startX += speakerRadius * 2;
//                 });
//             } else {
//                 // For single speaker
//                 ctx.fillStyle = '#e69138';
//                 ctx.beginPath();
//                 ctx.arc(x, height - 25, 12, 0, Math.PI * 2);
//                 ctx.fill();
                
//                 ctx.fillStyle = '#000';
//                 ctx.font = 'bold 10px Arial';
//                 ctx.textAlign = 'center';
//                 ctx.fillText((cue.speakerIdx + 1).toString(), x, height - 21);
//             }
//         });
//     }
    
//     drawPlayhead(ctx, width, height) {
//         if (!this.audioElement) return;
        
//         const audioDuration = this.audioElement.duration || 60;
//         const x = width * (this.playheadPosition / audioDuration);
        
//         // Draw playhead line
//         ctx.strokeStyle = '#ffffff';
//         ctx.lineWidth = 2;
//         ctx.beginPath();
//         ctx.moveTo(x, 0);
//         ctx.lineTo(x, height);
//         ctx.stroke();
        
//         // Draw playhead handle
//         ctx.fillStyle = '#ffffff';
//         ctx.beginPath();
//         ctx.arc(x, 10, 5, 0, Math.PI * 2);
//         ctx.fill();
//     }
// }

// // Initialize when the DOM is fully loaded
// document.addEventListener('DOMContentLoaded', () => {
//     // Wait a moment to ensure all required elements are loaded
//     setTimeout(() => {
//         window.contourDisplay = new ContourDisplay();
//     }, 1000);
// });

// export default ContourDisplay;