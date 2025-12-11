// Child Site JavaScript
// Handles content expansion/collapse and notifies parent iframe

document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById('toggle-button');
    const expandableContent = document.getElementById('expandable-content');
    const stateInfo = document.getElementById('state-info');
    const currentHeightDisplay = document.getElementById('current-height');
    let isExpanded = false;

    // Check if all required elements exist
    if (!toggleButton || !expandableContent || !stateInfo || !currentHeightDisplay) {
        console.error('Required elements not found');
        return;
    }

    // Function to update current height display
    function updateHeightDisplay() {
        try {
            const height = document.body.scrollHeight || document.documentElement.scrollHeight;
            if (currentHeightDisplay) {
                currentHeightDisplay.textContent = height;
            }
            
            // Notify parent iframe about height change
            notifyParentHeightChange(height);
        } catch (e) {
            console.error('Error updating height display:', e);
        }
    }

    // Function to notify parent iframe about height changes
    function notifyParentHeightChange(height) {
        try {
            // Send message to parent window
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'height-change',
                    height: height
                }, '*'); // In production, specify exact origin for security
            }
        } catch (e) {
            console.log('Could not send message to parent:', e);
        }
    }

    // Toggle content expansion
    toggleButton.addEventListener('click', function() {
        isExpanded = !isExpanded;
        
        if (isExpanded) {
            expandableContent.classList.add('expanded');
            toggleButton.textContent = 'Click to Collapse Content';
            toggleButton.classList.add('expanded');
            stateInfo.textContent = 'Content is expanded';
        } else {
            expandableContent.classList.remove('expanded');
            toggleButton.textContent = 'Click to Expand Content';
            toggleButton.classList.remove('expanded');
            stateInfo.textContent = 'Content is collapsed';
        }

        // Update height after a short delay to allow CSS transition
        setTimeout(function() {
            updateHeightDisplay();
        }, 100);
    });

    // Initial height update - delay to ensure page is fully rendered
    setTimeout(function() {
        updateHeightDisplay();
    }, 100);

    // Update height on window resize
    window.addEventListener('resize', function() {
        updateHeightDisplay();
    });

    // Monitor for content changes that might affect height
    let observer;
    if (typeof MutationObserver !== 'undefined') {
        try {
            observer = new MutationObserver(function(mutations) {
                updateHeightDisplay();
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'style']
            });
        } catch (e) {
            console.warn('MutationObserver not supported:', e);
        }
    }

    // Periodic height check (fallback) - reduced frequency
    let heightCheckInterval = setInterval(function() {
        updateHeightDisplay();
    }, 1000);
});

