document.addEventListener("DOMContentLoaded", () => {
    const speedValue = document.getElementById("speed-value");

    // Function to update displayed speed
    function updateSpeedDisplay(speed) {
        speedValue.textContent = speed + "x";
    }

    // Load and display saved speed with logging
    chrome.storage.sync.get("speed", (data) => {
        const speed = data.speed || 1;
        updateSpeedDisplay(speed);
        console.log("Popup loaded speed from storage: " + speed);
    });

    // Listen for storage changes with logging
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (changes.speed) {
            const newSpeed = changes.speed.newValue;
            updateSpeedDisplay(newSpeed);
            console.log("Speed updated from storage: " + newSpeed);
        }

        if (changes.currentDisplaySpeed) {
            const displaySpeed = changes.currentDisplaySpeed.newValue;
            updateSpeedDisplay(displaySpeed);
            console.log("Current display speed updated: " + displaySpeed);
        }
    });

    // Query active tab to get current speed with logging
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "getSpeed" }, (response) => {
            if (response && response.speed) {
                updateSpeedDisplay(response.speed);
                console.log("Received speed from content script: " + response.speed);
            } else {
                console.log("No response from content script");
            }
        });
    });
});
