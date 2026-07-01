/**
 * PauseMenu Class
 * Encapsulates pause/resume state bindings, modal overlays, setting updates,
 * and the interactive 3-2-1 countdown clock.
 */
export default class PauseMenu {
    constructor(pauseModalId, uiModule, ballModule, lightsModule, skyModule, glowLayer) {
        this.pauseModal = document.getElementById(pauseModalId);
        this.uiModule = uiModule;
        this.ballModule = ballModule;
        this.lightsModule = lightsModule;
        this.skyModule = skyModule;
        this.glowLayer = glowLayer;

        this.countdownInterval = null;

        this.modalDayNightBtn = document.getElementById("modalDayNightBtn");
        this.modalResetBtn = document.getElementById("modalResetBtn");
        this.modalResumeBtn = document.getElementById("modalResumeBtn");

        this.initialize();
    }

    initialize() {
        // Create single main Pause button (icon only, no text)
        let pauseBtn = document.getElementById("pauseBtn");
        if (!pauseBtn) {
            pauseBtn = document.createElement("button");
            pauseBtn.id = "pauseBtn";
            pauseBtn.innerText = "⏸";
            pauseBtn.style.position = "absolute";
            pauseBtn.style.top = "20px";
            pauseBtn.style.right = "20px";
            pauseBtn.style.padding = "10px 14px";
            pauseBtn.style.backgroundColor = "#051641";
            pauseBtn.style.color = "#ffffff";
            pauseBtn.style.border = "2px solid #00ff00";
            pauseBtn.style.borderRadius = "6px";
            pauseBtn.style.cursor = "pointer";
            pauseBtn.style.fontSize = "16px";
            pauseBtn.style.fontWeight = "bold";
            pauseBtn.style.zIndex = "1000";
            document.body.appendChild(pauseBtn);
        }

        pauseBtn.onclick = () => {
            this.open();
        };

        // Update Day/Night button text state in modal based on initial window.isDayMode
        if (this.modalDayNightBtn) {
            this.modalDayNightBtn.innerText = window.isDayMode ? "🌙 Switch to Night" : "☀️ Switch to Day";
            this.modalDayNightBtn.onclick = () => this.toggleDayNight();
        }

        // Modal Reset Game with countdown
        if (this.modalResetBtn) {
            this.modalResetBtn.onclick = () => this.resetMatch();
        }

        // Modal Resume Game with countdown
        if (this.modalResumeBtn) {
            this.modalResumeBtn.onclick = () => this.resumeMatch();
        }
    }

    open() {
        if (window.freeRoamActive) {
            const freeCamBtn = document.getElementById("freeCamBtn");
            if (freeCamBtn) {
                freeCamBtn.click();
            }
        }
        window.gamePaused = true;
        // Reset modal content visibility just in case a countdown was aborted
        const pauseMenuContent = document.getElementById("pauseMenuContent");
        const pauseCountdownContent = document.getElementById("pauseCountdownContent");
        if (pauseMenuContent) pauseMenuContent.style.display = "block";
        if (pauseCountdownContent) pauseCountdownContent.style.display = "none";

        if (this.pauseModal) this.pauseModal.style.display = "flex";
        if (this.uiModule) {
            this.uiModule.showAnnouncement("GAME PAUSED", "#FFFF00");
        }
    }

    close() {
        window.gamePaused = false;
        if (this.pauseModal) this.pauseModal.style.display = "none";
        if (this.uiModule) {
            this.uiModule.showAnnouncement("GAME RESUMED", "#00FF00");
        }
    }

    startCountdown(onComplete) {
        const pauseMenuContent = document.getElementById("pauseMenuContent");
        const pauseCountdownContent = document.getElementById("pauseCountdownContent");
        const countdownNumber = document.getElementById("countdownNumber");

        if (pauseMenuContent) pauseMenuContent.style.display = "none";
        if (pauseCountdownContent) pauseCountdownContent.style.display = "block";

        let count = 3;
        if (countdownNumber) {
            countdownNumber.innerText = count.toString();
        }

        if (this.countdownInterval) clearInterval(this.countdownInterval);

        this.countdownInterval = setInterval(() => {
            count--;
            if (count > 0) {
                if (countdownNumber) {
                    countdownNumber.innerText = count.toString();
                }
            } else {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;

                // Restore menu layout visibility for the next pause
                if (pauseMenuContent) pauseMenuContent.style.display = "block";
                if (pauseCountdownContent) pauseCountdownContent.style.display = "none";

                onComplete();
            }
        }, 1000);
    }

    toggleDayNight() {
        window.isDayMode = !window.isDayMode;
        if (this.lightsModule) this.lightsModule.applyTheme(window.isDayMode);
        if (this.skyModule) this.skyModule.applyTheme(window.isDayMode);
        if (this.glowLayer) this.glowLayer.isEnabled = !window.isDayMode;

        if (this.modalDayNightBtn) {
            this.modalDayNightBtn.innerText = window.isDayMode ? "🌙 Switch to Night" : "☀️ Switch to Day";
        }
    }

    resetMatch() {
        // Reset match assets in the background while still paused
        if (this.uiModule) {
            this.uiModule.resetGame();
        }
        if (this.ballModule) {
            this.ballModule.resetDelivery(true); // Pass true to reset bowler to run-up start position
        }

        this.startCountdown(() => {
            window.gamePaused = false;
            if (this.pauseModal) this.pauseModal.style.display = "none";
            if (this.uiModule) {
                this.uiModule.showAnnouncement("LET'S PLAY! 🏏", "#00FF00");
            }
        });
    }

    resumeMatch() {
        this.startCountdown(() => {
            this.close();
        });
    }
}
