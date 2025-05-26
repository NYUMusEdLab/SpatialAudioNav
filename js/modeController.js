/**
 * Mode Controller Helper Functions for the 3D Visualization
 */

// Add a helper function to make elements resizable
function makeResizable(element) {
    if (!element) return;
    
    // Create resize handles
    const handles = ['se', 'sw', 'ne', 'nw', 'n', 's', 'e', 'w'];
    handles.forEach(dir => {
        const handle = document.createElement('div');
        handle.className = `resize-handle resize-${dir}`;
        handle.style.position = 'absolute';
        handle.style.width = '10px';
        handle.style.height = '10px';
        handle.style.backgroundColor = '#e69138';
        handle.style.borderRadius = '50%';
        handle.style.zIndex = '1000';
        
        // Position based on direction
        if (dir.includes('s')) handle.style.bottom = '0';
        if (dir.includes('n')) handle.style.top = '0';
        if (dir.includes('e')) handle.style.right = '0';
        if (dir.includes('w')) handle.style.left = '0';
        
        // Center handles on edges if needed
        if (dir === 'n' || dir === 's') {
            handle.style.left = '50%';
            handle.style.transform = 'translateX(-50%)';
        }
        if (dir === 'e' || dir === 'w') {
            handle.style.top = '50%';
            handle.style.transform = 'translateY(-50%)';
        }
        
        // Set cursor style
        handle.style.cursor = `${dir}-resize`;
        
        element.appendChild(handle);
        
        // Add resize event listener
        handle.addEventListener('mousedown', e => startResize(e, dir));
    });
    
    function startResize(e, dir) {
        e.preventDefault();
        
        // Initial dimensions
        const rect = element.getBoundingClientRect();
        const initialWidth = rect.width;
        const initialHeight = rect.height;
        
        // Initial mouse position
        const initialX = e.clientX;
        const initialY = e.clientY;
        
        // Add event listeners
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        
        function resize(e) {
            const dx = e.clientX - initialX;
            const dy = e.clientY - initialY;
            
            // Resize based on direction
            if (dir.includes('e')) element.style.width = `${initialWidth + dx}px`;
            if (dir.includes('s')) element.style.height = `${initialHeight + dy}px`;
            
            // Update canvas if available
            const canvas = element.querySelector('canvas');
            if (canvas && window.visualizer3D) {
                const newRect = element.getBoundingClientRect();
                canvas.width = newRect.width - 20;
                canvas.height = newRect.height - 40;
                window.visualizer3D.updateTopdownView();
            }
        }
        
        function stopResize() {
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('mouseup', stopResize);
        }
    }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make the topdown view resizable in engineer mode
    const topdownView = document.querySelector('.topdown-view');
    if (topdownView) {
        makeResizable(topdownView);
    }
});
