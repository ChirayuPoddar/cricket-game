// src/ui/scoreboard.js
export default class GameUI {
    constructor() {
        this.runs = 0;
        this.wickets = 0;
        this.totalBalls = 0;

        this.scoreContainer = null;
        this.alertContainer = null;
    }

    setup() {
        this.createDOMElements();
        this.updateDisplay();
    }

    createDOMElements() {
        // 1. Create a container for the persistent Scoreboard
        this.scoreContainer = document.createElement("div");
        this.scoreContainer.style.position = "absolute";
        this.scoreContainer.style.top = "20px";
        this.scoreContainer.style.left = "20px";
        this.scoreContainer.style.padding = "15px 25px";
        this.scoreContainer.style.background = "rgba(10, 20, 40, 0.85)";
        this.scoreContainer.style.color = "#ffffff";
        this.scoreContainer.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        this.scoreContainer.style.fontSize = "24px";
        this.scoreContainer.style.fontWeight = "bold";
        this.scoreContainer.style.borderRadius = "8px";
        this.scoreContainer.style.borderLeft = "6px solid #051641"; // Royal Blue branding accent
        this.scoreContainer.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
        this.scoreContainer.style.pointerEvents = "none"; // Permits mouse inputs to go through to canvas
        this.scoreContainer.style.zIndex = "1000";
        document.body.appendChild(this.scoreContainer);

        // 2. Create a hidden center overlay container for major announcements (4s, 6s, OUTs)
        this.alertContainer = document.createElement("div");
        this.alertContainer.style.position = "absolute";
        this.alertContainer.style.top = "30%";
        this.alertContainer.style.left = "50%";
        this.alertContainer.style.transform = "translate(-50%, -50%)";
        this.alertContainer.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        this.alertContainer.style.fontSize = "64px";
        this.alertContainer.style.fontWeight = "900";
        this.alertContainer.style.textAlign = "center";
        this.alertContainer.style.textShadow = "0 0 20px rgba(0,0,0,0.6)";
        this.alertContainer.style.opacity = "0";
        this.alertContainer.style.transition = "opacity 0.2s ease-in-out, transform 0.2s ease-in-out";
        this.alertContainer.style.pointerEvents = "none";
        this.alertContainer.style.zIndex = "1001";
        document.body.appendChild(this.alertContainer);
    }

    addRuns(amount) {
        this.runs += amount;
        this.totalBalls += 1; // Safely increment the ball count on a successful hit!

        if (amount === 6) {
            this.triggerAlert("⚡ CRACKING SIX! ⚡", "#00ffcc");
        } else if (amount === 4) {
            this.triggerAlert("FOUR RUNS! 🏏", "#ffcc00");
        }
        this.updateDisplay();
    }

    registerWicket() {
        this.wickets += 1;
        this.totalBalls += 1; // Increment the ball count on a clean bowled out!
        this.triggerAlert("BOWLED!! OUT! 🛑", "#ff3333");
        this.updateDisplay();
    }

    incrementBall() {
        this.totalBalls += 1;
    }

    updateDisplay() {
        // Convert aggregate ball count into standard Cricket overs notation (6 balls = 1 over)
        const completedOvers = Math.floor(this.totalBalls / 6);
        const remainingBalls = this.totalBalls % 6;

        this.scoreContainer.innerHTML = `
            <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #aaa; margin-bottom: 4px;">Live Match Score</div>
            <div style="font-size: 36px; line-height: 38px;">${this.runs} <span style="font-size: 24px; color: #ff3333;">/ ${this.wickets}</span></div>
            <div style="font-size: 16px; color: #8cd6ff; margin-top: 6px; font-weight: 500;">Overs: ${completedOvers}.${remainingBalls}</div>
        `;
    }

    triggerAlert(message, color) {
        this.alertContainer.innerHTML = message;
        this.alertContainer.style.color = color;
        this.alertContainer.style.opacity = "1";
        this.alertContainer.style.transform = "translate(-50%, -50%) scale(1.1)";

        // Fade away and shrink back down automatically after 1.8 seconds
        setTimeout(() => {
            this.alertContainer.style.opacity = "0";
            this.alertContainer.style.transform = "translate(-50%, -50%) scale(1.0)";
        }, 1800);
    }
}