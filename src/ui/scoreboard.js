import EventBus from '../core/EventBus.js';

// src/ui/scoreboard.js
export default class GameUI {
    constructor() {
        this.runs = 0;
        this.wickets = 0;
        this.totalBalls = 0;
        this.fours = 0;
        this.sixes = 0;
        this.dotBalls = 0;

        this.scoreContainer = null;
        this.alertContainer = null;
        this.statsContainer = null;
        this.gameStartTime = null;
    }

    setup(onToggleMode) {
        this.createDOMElements(onToggleMode);
        this.gameStartTime = Date.now();
        this.updateDisplay();
        
        // Subscribe to EventBus events for analytics and feedback
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen to shot events
        EventBus.on(EventBus.GAME_EVENTS.SHOT_PLAYED, (data) => {
            console.log(`📊 Analytics: ${data.shotType} shot with ${data.power}% power`);
        });

        // Listen to boundary events
        EventBus.on(EventBus.GAME_EVENTS.BOUNDARY_FOUR, (data) => {
            console.log(`📊 Analytics: FOUR recorded at distance ${data.distance.toFixed(1)}m`);
        });

        EventBus.on(EventBus.GAME_EVENTS.BOUNDARY_SIX, (data) => {
            console.log(`📊 Analytics: SIX recorded (airborne: ${data.airborneDistance.toFixed(1)}m)`);
        });

        // Listen to runs events
        EventBus.on(EventBus.GAME_EVENTS.RUNS_SCORED, (data) => {
            console.log(`📊 Analytics: ${data.runs} runs scored`);
        });

        // Listen to wicket events
        EventBus.on(EventBus.GAME_EVENTS.WICKET_DOWN, (data) => {
            console.log(`📊 Analytics: Wicket down - ${data.dismissalType}`);
        });
    }

    createDOMElements(onToggleMode) {
        // 1. Create a container for the persistent Scoreboard
        this.scoreContainer = document.createElement("div");
        this.scoreContainer.style.position = "absolute";
        this.scoreContainer.style.top = "20px";
        this.scoreContainer.style.left = "20px";
        this.scoreContainer.style.padding = "15px 25px";
        this.scoreContainer.style.background = "rgba(10, 20, 40, 0.95)";
        this.scoreContainer.style.color = "#ffffff";
        this.scoreContainer.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        this.scoreContainer.style.fontSize = "24px";
        this.scoreContainer.style.fontWeight = "bold";
        this.scoreContainer.style.borderRadius = "8px";
        this.scoreContainer.style.borderLeft = "6px solid #00ff00";
        this.scoreContainer.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
        this.scoreContainer.style.pointerEvents = "none";
        this.scoreContainer.style.zIndex = "1000";
        document.body.appendChild(this.scoreContainer);

        // 2. Create a stats container (runs by type)
        this.statsContainer = document.createElement("div");
        this.statsContainer.style.position = "absolute";
        this.statsContainer.style.bottom = "20px";
        this.statsContainer.style.left = "20px";
        this.statsContainer.style.padding = "15px 25px";
        this.statsContainer.style.background = "rgba(10, 20, 40, 0.95)";
        this.statsContainer.style.color = "#ffffff";
        this.statsContainer.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        this.statsContainer.style.fontSize = "14px";
        this.statsContainer.style.borderRadius = "8px";
        this.statsContainer.style.borderLeft = "6px solid #FFD700";
        this.statsContainer.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
        this.statsContainer.style.pointerEvents = "none";
        this.statsContainer.style.zIndex = "1000";
        document.body.appendChild(this.statsContainer);

        // 3. Create a hidden center overlay container for major announcements
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
        if (window.gamePaused) return;
        
        this.runs += amount;
        this.totalBalls += 1;

        if (amount === 6) {
            this.sixes += 1;
            this.triggerAlert("⚡ CRACKING SIX! ⚡", "#00ffcc");
        } else if (amount === 4) {
            this.fours += 1;
            this.triggerAlert("FOUR RUNS! 🏏", "#ffcc00");
        } else if (amount === 0) {
            this.dotBalls += 1;
        }
        this.updateDisplay();
    }

    registerWicket() {
        if (window.gamePaused) return;
        
        this.wickets += 1;
        this.totalBalls += 1;
        this.triggerAlert("BOWLED!! OUT! 🛑", "#ff3333");
        this.updateDisplay();
    }

    incrementBall() {
        if (window.gamePaused) return;
        this.totalBalls += 1;
        this.dotBalls += 1;
    }

    updateDisplay() {
        const completedOvers = Math.floor(this.totalBalls / 6);
        const remainingBalls = this.totalBalls % 6;
        const strikeRate = this.totalBalls > 0 ? ((this.runs / this.totalBalls) * 100).toFixed(1) : 0;

        this.scoreContainer.innerHTML = `
            <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #aaa; margin-bottom: 4px;">🏏 Live Match Score</div>
            <div style="font-size: 36px; line-height: 38px;">${this.runs} <span style="font-size: 24px; color: #ff3333;">/ ${this.wickets}</span></div>
            <div style="font-size: 16px; color: #8cd6ff; margin-top: 6px; font-weight: 500;">Overs: ${completedOvers}.${remainingBalls}</div>
            <div style="font-size: 12px; color: #aaa; margin-top: 4px;">Strike Rate: ${strikeRate}%</div>
        `;

        this.statsContainer.innerHTML = `
            <div style="font-size: 12px; font-weight: bold; margin-bottom: 6px;">📊 Match Statistics</div>
            <div>4️⃣ Fours: ${this.fours} | 6️⃣ Sixes: ${this.sixes}</div>
            <div>⚪ Dots: ${this.dotBalls} | 📍 Balls: ${this.totalBalls}</div>
        `;
    }

    resetGame() {
        this.runs = 0;
        this.wickets = 0;
        this.totalBalls = 0;
        this.fours = 0;
        this.sixes = 0;
        this.dotBalls = 0;
        this.gameStartTime = Date.now();
        this.showAnnouncement("GAME RESET! 🎮", "#00FF00");
        this.updateDisplay();
    }

    triggerAlert(message, color) {
        this.alertContainer.innerHTML = message;
        this.alertContainer.style.color = color;
        this.alertContainer.style.opacity = "1";
        this.alertContainer.style.transform = "translate(-50%, -50%) scale(1.1)";

        setTimeout(() => {
            this.alertContainer.style.opacity = "0";
            this.alertContainer.style.transform = "translate(-50%, -50%) scale(1.0)";
        }, 1800);
    }

    /**
     * Flashes a massive text announcement on the screen, then fades out.
     */
    showAnnouncement(text, color) {
        if (!this.alertContainer) return;

        this.alertContainer.innerText = text;
        this.alertContainer.style.color = color;
        this.alertContainer.style.opacity = "1";
        this.alertContainer.style.transform = "translate(-50%, -50%) scale(1.2)";

        setTimeout(() => {
            this.alertContainer.style.opacity = "0";
            this.alertContainer.style.transform = "translate(-50%, -50%) scale(1.0)";
        }, 2000);
    }

}