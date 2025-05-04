console.log("Content script loaded");

// Variables to track desired speed
let desiredSpeed = 1;
let baseSpeed = 1;
let isDoubleSpeed = false;
let speedOverlay = null;

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
        video.playbackRate = speed;
        console.log("Speed set to: " + speed);
        showOverlay(speed);
        
        // Update currentDisplaySpeed in storage for popup
        chrome.storage.sync.set({ currentDisplaySpeed: speed }, () => {
            console.log("Current display speed saved: " + speed);
        });
        
        // Only update baseSpeed and desiredSpeed if not temporarily changing speed
        if (updateBase) {
            baseSpeed = speed;
            desiredSpeed = speed;
            // Save the base speed to storage
            chrome.storage.sync.set({ speed: speed }, () => {
                console.log("Base speed saved to storage: " + speed);
            });
        }
    } else {
        console.log("No video element found");
    }
}

// Function to double the speed temporarily
function enableDoubleSpeed() {
    if (!isDoubleSpeed) {
        isDoubleSpeed = true;
        setPlaybackRate(baseSpeed * 2, false);
        console.log("Double speed enabled, base speed: " + baseSpeed);
    }
}

// Function to restore normal speed
function disableDoubleSpeed() {
    if (isDoubleSpeed) {
        isDoubleSpeed = false;
        // If playback speed with Space down is 3x or more, set to 1.5x. Otherwise, restore baseSpeed.
        const currentSpeed = baseSpeed * 2;
        if (currentSpeed >= 3) {
            baseSpeed = 1.5;
            setPlaybackRate(1.5, false);
            console.log("Double speed disabled (was >=3x), set to 1.5x");
        } else {
            setPlaybackRate(baseSpeed, false);
            console.log("Double speed disabled, restored to: " + baseSpeed);
        }
    }
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
    desiredSpeed = baseSpeed;
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
                console.log("Sending stored speed to popup: " + storedSpeed);
                sendResponse({ speed: storedSpeed });
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
                enableDoubleSpeed();
            }
        });
        
        video.addEventListener("mouseup", (event) => {
            if (event.button === 0 && !(event.target.id === "speed-overlay")) {
                console.log("Mouse up on video");
                disableDoubleSpeed();
            }
        });

        // Handle mouse leaving the video while button is pressed
        video.addEventListener("mouseleave", (event) => {
            // Only trigger if not leaving to the overlay
            if (!(event.relatedTarget && event.relatedTarget.id === "speed-overlay")) {
                console.log("Mouse left video");
                disableDoubleSpeed();
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

        const step = 0.25;
        if (event.code === "Period") {
            baseSpeed = Math.min(baseSpeed + step, 16);
        } else if (event.code === "Comma") {
            baseSpeed = Math.max(baseSpeed - step, 0.25);
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
    // Handle space key for double speed
    else if (event.code === "Space") {
        console.log("Space key pressed");
        // Only prevent default if we're not in an input field
        if (document.activeElement.tagName !== "INPUT" && 
            document.activeElement.tagName !== "TEXTAREA") {
            // Don't prevent default as this would interfere with YouTube's own play/pause functionality
        }
        enableDoubleSpeed();
    }
}, true);

document.addEventListener("keyup", (event) => {
    if (event.code === "Space") {
        console.log("Space key released");
        disableDoubleSpeed();
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
        
        // Enforce the desired speed
        const targetSpeed = isDoubleSpeed ? baseSpeed * 2 : baseSpeed;
        if (video.playbackRate !== targetSpeed) {
            video.playbackRate = targetSpeed;
            console.log("Enforced speed to: " + targetSpeed);
            showOverlay(targetSpeed);
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
        const targetSpeed = isDoubleSpeed ? baseSpeed * 2 : baseSpeed;
        setPlaybackRate(targetSpeed, false);
    }, 1000);
});

// Initial setup
setTimeout(() => {
    attachVideoMouseEvents();
}, 1000);
