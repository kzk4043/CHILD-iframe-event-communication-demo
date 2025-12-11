// Child Site JavaScript
// Handles content expansion/collapse and notifies parent iframe

console.log('[CHILD] Script loading...');
const childStartTime = performance.now();

document.addEventListener('DOMContentLoaded', function() {
    console.log('[CHILD] DOMContentLoaded event fired');
    const loadTime = performance.now() - childStartTime;
    console.log(`[CHILD] DOM ready in ${loadTime.toFixed(2)}ms`);

    const toggleButton = document.getElementById('toggle-button');
    const expandableContent = document.getElementById('expandable-content');
    const stateInfo = document.getElementById('state-info');
    const currentHeightDisplay = document.getElementById('current-height');
    let isExpanded = false;

    console.log('[CHILD] Elements found:', {
        toggleButton: !!toggleButton,
        expandableContent: !!expandableContent,
        stateInfo: !!stateInfo,
        currentHeightDisplay: !!currentHeightDisplay
    });

    // Check if all required elements exist
    if (!toggleButton || !expandableContent || !stateInfo || !currentHeightDisplay) {
        console.error('[CHILD] Required elements not found');
        return;
    }

    // Function to update current height display
    let updateCount = 0;
    function updateHeightDisplay() {
        updateCount++;
        const updateStartTime = performance.now();
        try {
            const bodyHeight = document.body.scrollHeight;
            const docHeight = document.documentElement.scrollHeight;
            const height = bodyHeight || docHeight;
            
            console.log(`[CHILD] updateHeightDisplay #${updateCount}:`, {
                bodyScrollHeight: bodyHeight,
                docScrollHeight: docHeight,
                finalHeight: height
            });
            
            if (currentHeightDisplay) {
                currentHeightDisplay.textContent = height;
            }
            
            // Notify parent iframe about height change
            notifyParentHeightChange(height);
            
            const updateTime = performance.now() - updateStartTime;
            console.log(`[CHILD] Height update completed in ${updateTime.toFixed(2)}ms`);
        } catch (e) {
            console.error('[CHILD] Error updating height display:', e);
        }
    }

    // Function to notify parent iframe about height changes
    let messageCount = 0;
    function notifyParentHeightChange(height) {
        messageCount++;
        try {
            // Send message to parent window
            if (window.parent && window.parent !== window) {
                const message = {
                    type: 'height-change',
                    height: height
                };
                console.log(`[CHILD] Sending postMessage #${messageCount} to parent:`, message);
                window.parent.postMessage(message, '*'); // In production, specify exact origin for security
                console.log(`[CHILD] postMessage sent successfully`);
            } else {
                console.log('[CHILD] No parent window or same window, skipping postMessage');
            }
        } catch (e) {
            console.error('[CHILD] Could not send message to parent:', e);
        }
    }

    // Toggle content expansion
    console.log('[CHILD] Adding click event listener to toggle button');
    toggleButton.addEventListener('click', function() {
        const clickTime = performance.now();
        console.log('[CHILD] Toggle button clicked');
        isExpanded = !isExpanded;
        
        if (isExpanded) {
            console.log('[CHILD] Expanding content');
            expandableContent.classList.add('expanded');
            toggleButton.textContent = 'Click to Collapse Content';
            toggleButton.classList.add('expanded');
            stateInfo.textContent = 'Content is expanded';
        } else {
            console.log('[CHILD] Collapsing content');
            expandableContent.classList.remove('expanded');
            toggleButton.textContent = 'Click to Expand Content';
            toggleButton.classList.remove('expanded');
            stateInfo.textContent = 'Content is collapsed';
        }

        // Update height after a short delay to allow CSS transition
        console.log('[CHILD] Scheduling height update in 100ms');
        setTimeout(function() {
            updateHeightDisplay();
            const totalTime = performance.now() - clickTime;
            console.log(`[CHILD] Toggle action completed in ${totalTime.toFixed(2)}ms`);
        }, 100);
    });

    // Initial height update - delay to ensure page is fully rendered
    console.log('[CHILD] Scheduling initial height update in 100ms');
    setTimeout(function() {
        console.log('[CHILD] Performing initial height update');
        updateHeightDisplay();
    }, 100);

    // Update height on window resize
    console.log('[CHILD] Adding window resize event listener');
    window.addEventListener('resize', function() {
        console.log('[CHILD] Window resized');
        updateHeightDisplay();
    });

    // Monitor for content changes that might affect height
    let observer;
    let mutationCount = 0;
    if (typeof MutationObserver !== 'undefined') {
        try {
            console.log('[CHILD] Creating MutationObserver');
            observer = new MutationObserver(function(mutations) {
                mutationCount++;
                console.log(`[CHILD] MutationObserver triggered #${mutationCount}:`, mutations.length, 'mutations');
                updateHeightDisplay();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style']
            });
            console.log('[CHILD] MutationObserver attached to document.body');
        } catch (e) {
            console.warn('[CHILD] MutationObserver not supported:', e);
        }
    } else {
        console.warn('[CHILD] MutationObserver not available in this browser');
    }

    // Periodic height check (fallback) - reduced frequency
    console.log('[CHILD] Starting periodic height check (every 1s)');
    let heightCheckInterval = setInterval(function() {
        updateHeightDisplay();
    }, 1000);

    const initTime = performance.now() - childStartTime;
    console.log(`[CHILD] Initialization complete in ${initTime.toFixed(2)}ms`);
});

