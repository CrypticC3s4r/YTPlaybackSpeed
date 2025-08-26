console.log("Content script loaded");

// Variables to track desired speed
let desiredSpeed = 1;
let baseSpeed = 1;
let isDoubleSpeed = false;
let speedOverlay = null;

// Variables for mouse movement tracking
let isDragging = false;
let startX = 0;
let startY = 0;
let currentSpeed = 1;
let lastDirectionChange = 0; // Track last speed change time for comfortable spacing
let lastSeekTime = 0; // Track last seek time for comfortable spacing

// Function to handle video seeking based on vertical mouse movement
function handleVideoSeeking(deltaY, currentTime) {
    const video = document.querySelector("video");
    if (!video) return;

    // Define comfortable movement threshold (pixels per seek step)
    const seekThreshold = 60; // Pixels of vertical movement for one seek step
    const seekStep = 10; // Seconds to seek per step

    // Calculate how many seek steps based on vertical movement
    const seekSteps = Math.floor(Math.abs(deltaY) / seekThreshold);

    if (seekSteps > 0 && (currentTime - lastSeekTime) > 200) { // 200ms delay between seeks
        let newTime;
        if (deltaY < 0) {
            // Moving up - fast forward
            newTime = Math.min(video.duration, video.currentTime + (seekSteps * seekStep));
            console.log(`Seeking forward ${seekSteps * seekStep} seconds`);
        } else {
            // Moving down - fast backward
            newTime = Math.max(0, video.currentTime - (seekSteps * seekStep));
            console.log(`Seeking backward ${seekSteps * seekStep} seconds`);
        }

        video.currentTime = newTime;
        lastSeekTime = currentTime;

        // Show seeking overlay
        showOverlay(deltaY < 0 ? `>> ${seekSteps * seekStep}s` : `<< ${seekSteps * seekStep}s`);
    }
}

// Function to handle mouse movement for both speed control (horizontal) and seeking (vertical)
function handleMouseMovement(event) {
    if (!isDragging) return;

    const currentX = event.clientX;
    const currentY = event.clientY;
    const currentTime = Date.now();

    // Calculate distances from anchor (start) position
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    // Handle vertical movement for seeking
    handleVideoSeeking(deltaY, currentTime);

    // Handle horizontal movement for speed control
    // Define comfortable movement threshold (pixels per speed change)
    const movementThreshold = 40; // Half the distance for 0.5x steps
    const anchorThreshold = 20; // Threshold for returning to anchor/base speed

    // Calculate how many 0.5 speed steps based on movement from anchor
    const speedSteps = Math.floor(Math.abs(deltaX) / movementThreshold);
    const speedIncrement = speedSteps * 0.5;

    // Check if cursor is near the horizontal anchor point (return to base speed)
    if (Math.abs(deltaX) < anchorThreshold) {
        if (currentSpeed !== baseSpeed && (currentTime - lastDirectionChange) > 150) {
            currentSpeed = baseSpeed;
            setPlaybackRate(currentSpeed, false);
            lastDirectionChange = currentTime;
            console.log(`Returned to horizontal anchor point, speed: ${currentSpeed}x`);
        }
        return;
    }

    if (speedIncrement > 0) {
        // Determine direction and calculate new speed from base speed
        let newSpeed;
        if (deltaX > 0) {
            // Moving right from anchor - increase speed in 0.5 increments
            newSpeed = Math.max(0.5, baseSpeed + speedIncrement);
        } else {
            // Moving left from anchor - decrease speed in 0.5 increments
            newSpeed = Math.max(0.5, baseSpeed - speedIncrement);
        }

        // Only update if speed actually changed and enough time has passed (for comfortable spacing)
        if (newSpeed !== currentSpeed && (currentTime - lastDirectionChange) > 150) {
            currentSpeed = newSpeed;
            setPlaybackRate(currentSpeed, false);
            lastDirectionChange = currentTime;
            console.log(`Horizontal movement from anchor - speed: ${currentSpeed}x`);
        }
    }
}

// Function to create the overlay element if it doesn't exist
function createOverlay() {
    if (!speedOverlay) {
        speedOverlay = document.createElement("div");
        speedOverlay.id = "speed-overlay";
        speedOverlay.style.position = "fixed";
        speedOverlay.style.top = "50%";
        speedOverlay.style.left = "50%";
        speedOverlay.style.transform = "translate(-50%, -50%)";
        speedOverlay.style.padding = "10px 20px";
        speedOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
        speedOverlay.style.color = "white";
        speedOverlay.style.fontSize = "24px";
        speedOverlay.style.borderRadius = "4px";
        speedOverlay.style.zIndex = "9999";
        speedOverlay.style.opacity = "0";
        speedOverlay.style.transition = "opacity 0.3s ease";
        document.body.appendChild(speedOverlay);
    }
}

// Function to display the current speed on-screen
function showOverlay(speed) {
    createOverlay();
    speedOverlay.textContent = speed + "x";
    speedOverlay.style.opacity = "1";
    if (speedOverlay.hideTimeout) clearTimeout(speedOverlay.hideTimeout);
    speedOverlay.hideTimeout = setTimeout(() => {
        speedOverlay.style.opacity = "0";
    }, 1500); // overlay visible for 1.5 seconds
}

// Function to set playback rate with logging and update the overlay
function setPlaybackRate(speed, updateBase = true) {
    const video = document.querySelector("video");
    if (video) {
        // Ensure speed is in 0.5 increments and at least 0.5
        const validSpeed = Math.max(0.5, Math.round(speed * 2) / 2);
        video.playbackRate = validSpeed;
        console.log("Speed set to: " + validSpeed);
        showOverlay(validSpeed);

        // Update currentDisplaySpeed in storage for popup
        chrome.storage.sync.set({ currentDisplaySpeed: validSpeed }, () => {
            console.log("Current display speed saved: " + validSpeed);
        });

        // Only update baseSpeed and desiredSpeed if not temporarily changing speed
        if (updateBase) {
            baseSpeed = validSpeed;
            desiredSpeed = validSpeed;
            currentSpeed = validSpeed;
            // Save the base speed to storage
            chrome.storage.sync.set({ speed: validSpeed }, () => {
                console.log("Base speed saved to storage: " + validSpeed);
            });
        }
    } else {
        console.log("No video element found");
    }
}

// Functions for compatibility (keeping for any other references)
function enableDoubleSpeed() {
    // Mouse movement now handles speed changes, keeping for compatibility
    console.log("Double speed function called (legacy compatibility)");
}

function disableDoubleSpeed() {
    // Mouse movement now handles speed changes, keeping for compatibility
    console.log("Disable double speed function called (legacy compatibility)");
}

// Attach a ratechange listener to the video element to update the overlay
function attachRateChangeListener() {
    const video = document.querySelector("video");
    if (video && !video.hasRateChangeListener) {
        video.addEventListener("ratechange", () => {
            console.log("Video ratechange event: " + video.playbackRate);
            showOverlay(video.playbackRate);
        });
        video.hasRateChangeListener = true;
    }
}

// Apply saved speed on page load with logging
chrome.storage.sync.get("speed", (data) => {
    baseSpeed = data.speed || 1;
    // Ensure baseSpeed is at least 0.5 and in 0.5 increments
    baseSpeed = Math.max(0.5, Math.round(baseSpeed * 2) / 2);
    desiredSpeed = baseSpeed;
    currentSpeed = baseSpeed;
    setPlaybackRate(baseSpeed);
    console.log("Initial speed from storage: " + baseSpeed);
    attachRateChangeListener();
});

// Handle messages from popup with logging
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getSpeed") {
        const video = document.querySelector("video");
        if (video) {
            const currentSpeed = video.playbackRate;
            console.log("Sending video speed to popup: " + currentSpeed);
            sendResponse({ speed: currentSpeed });
        } else {
            chrome.storage.sync.get("speed", (data) => {
                const storedSpeed = data.speed || 1;
                // Ensure stored speed is in proper 0.5 increments
                const validStoredSpeed = Math.max(0.5, Math.round(storedSpeed * 2) / 2);
                console.log("Sending stored speed to popup: " + validStoredSpeed);
                sendResponse({ speed: validStoredSpeed });
            });
            return true; // Keep the channel open for async response
        }
    }
});

// Attach mouse events directly to the video element
function attachVideoMouseEvents() {
    const video = document.querySelector("video");
    if (video && !video.hasMouseEvents) {
        console.log("Attaching mouse events to video element");
        // Prevent overlay (speedOverlay) from interfering with mouse events on the video
        if (speedOverlay) {
            speedOverlay.style.pointerEvents = "none";
        }

        video.addEventListener("mousedown", (event) => {
            // Ignore events if mouse is over the overlay
            if (event.button === 0 && !(event.target.id === "speed-overlay")) {
                console.log("Mouse down on video");
                isDragging = true;
                startX = event.clientX;
                startY = event.clientY;
                currentSpeed = baseSpeed; // Always start from base speed as the anchor point
                console.log(`Started dragging from anchor point at speed: ${currentSpeed}x (coordinates: ${startX}, ${startY})`);
            }
        });
        
        video.addEventListener("mousemove", (event) => {
            handleMouseMovement(event);
        });

        video.addEventListener("mouseup", (event) => {
            if (event.button === 0 && !(event.target.id === "speed-overlay")) {
                console.log("Mouse up on video");
                isDragging = false;
                // Reset to anchor point (base speed) when releasing
                currentSpeed = baseSpeed;
                setPlaybackRate(baseSpeed, false);
                console.log(`Mouse released, returned to anchor point speed: ${baseSpeed}x`);
            }
        });

        // Handle mouse leaving the video while button is pressed
        video.addEventListener("mouseleave", (event) => {
            // Only trigger if not leaving to the overlay
            if (!(event.relatedTarget && event.relatedTarget.id === "speed-overlay")) {
                console.log("Mouse left video");
                isDragging = false;
                // Reset to anchor point (base speed) when leaving video area
                currentSpeed = baseSpeed;
                setPlaybackRate(baseSpeed, false);
                console.log(`Mouse left video, returned to anchor point speed: ${baseSpeed}x`);
            }
        });

        video.hasMouseEvents = true;
    }
}

// Space key event handling for the whole document
document.addEventListener("keydown", (event) => {
    // Handle Shift + . and Shift + , for speed adjustments
    if (event.shiftKey && (event.code === "Period" || event.code === "Comma")) {
        console.log("Key pressed: " + event.code);
        event.preventDefault();
        event.stopPropagation();

        const step = 0.5; // Use 0.5 steps for consistency
        if (event.code === "Period") {
            baseSpeed = Math.min(baseSpeed + step, 16);
        } else if (event.code === "Comma") {
            baseSpeed = Math.max(baseSpeed - step, 0.5);
        }
        
        console.log("New base speed calculated: " + baseSpeed);
        // Update speed while maintaining double speed state if active
        if (isDoubleSpeed) {
            setPlaybackRate(baseSpeed * 2, false);
        } else {
            setPlaybackRate(baseSpeed);
        }
    }
    // Handle Shift + [1-9] for quick set speeds
    else if (event.shiftKey && event.code.startsWith("Digit")) {
        const digit = parseInt(event.code.replace("Digit", ""), 10);
        if (digit >= 1 && digit <= 9) {
            baseSpeed = digit;
            console.log(`Shift+${digit} pressed: Setting speed to ${digit}x`);
            if (isDoubleSpeed) {
                setPlaybackRate(baseSpeed * 2, false);
            } else {
                setPlaybackRate(baseSpeed);
            }
        }
    }
    // Handle space key (keeping for compatibility with YouTube's play/pause)
    else if (event.code === "Space") {
        console.log("Space key pressed");
        // Only prevent default if we're not in an input field
        if (document.activeElement.tagName !== "INPUT" &&
            document.activeElement.tagName !== "TEXTAREA") {
            // Don't prevent default as this would interfere with YouTube's own play/pause functionality
        }
        // Space key behavior is now handled by mouse movement, keeping for YouTube compatibility
    }
}, true);

document.addEventListener("keyup", (event) => {
    if (event.code === "Space") {
        console.log("Space key released");
        // Space key behavior is now handled by mouse movement, keeping for YouTube compatibility
    }
}, true);

// Periodically enforce the desired speed and check for video element
setInterval(() => {
    const video = document.querySelector("video");
    if (video) {
        // Attach mouse events if not already attached
        if (!video.hasMouseEvents) {
            attachVideoMouseEvents();
        }
        
        // Enforce the desired speed (only if not currently being controlled by mouse movement)
        if (!isDragging) {
            const targetSpeed = baseSpeed;
            if (video.playbackRate !== targetSpeed) {
                video.playbackRate = targetSpeed;
                console.log("Enforced speed to: " + targetSpeed);
                showOverlay(targetSpeed);
            }
        }
    }
}, 500); // Check every 500ms

// Reapply speed on YouTube navigation with logging and reattach listeners
document.addEventListener("yt-navigate-finish", () => {
    console.log("Navigation finished, applying speed");
    attachRateChangeListener();
    // Small delay to ensure video element is available
    setTimeout(() => {
        attachVideoMouseEvents();
        setPlaybackRate(baseSpeed, false);
    }, 1000);
});

// Initial setup
setTimeout(() => {
    attachVideoMouseEvents();
}, 1000);
