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
        this.currentOverBalls = []; // Track outcomes of current over

        this.scoreContainer = null;
        this.alertContainer = null;
        this.statsContainer = null;
        this.overSummaryContainer = null;
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
            // console.log(`📊 Analytics: ${data.shotType} shot with ${data.power}% power`);
        });

        // Listen to boundary events
        EventBus.on(EventBus.GAME_EVENTS.BOUNDARY_FOUR, (data) => {
            // console.log(`📊 Analytics: FOUR recorded at distance ${data.distance.toFixed(1)}m`);
        });

        EventBus.on(EventBus.GAME_EVENTS.BOUNDARY_SIX, (data) => {
            // console.log(`📊 Analytics: SIX recorded (airborne: ${data.airborneDistance.toFixed(1)}m)`);
        });

        // Listen to runs events
        EventBus.on(EventBus.GAME_EVENTS.RUNS_SCORED, (data) => {
            // console.log(`📊 Analytics: ${data.runs} runs scored`);
        });

        // Listen to wicket events
        EventBus.on(EventBus.GAME_EVENTS.WICKET_DOWN, (data) => {
            // console.log(`📊 Analytics: Wicket down - ${data.dismissalType}`);
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

        // Style helper for fade-in animation
        const style = document.createElement("style");
        style.innerHTML = `
            @keyframes modalFadeIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1.0); }
            }
        `;
        document.head.appendChild(style);

        // Over summary overlay container
        this.overSummaryContainer = document.createElement("div");
        this.overSummaryContainer.id = "overSummaryModal";
        this.overSummaryContainer.style.position = "absolute";
        this.overSummaryContainer.style.top = "0";
        this.overSummaryContainer.style.left = "0";
        this.overSummaryContainer.style.width = "100%";
        this.overSummaryContainer.style.height = "100%";
        this.overSummaryContainer.style.background = "rgba(5, 10, 25, 0.88)";
        this.overSummaryContainer.style.backdropFilter = "blur(8px)";
        this.overSummaryContainer.style.display = "none";
        this.overSummaryContainer.style.justifyContent = "center";
        this.overSummaryContainer.style.alignItems = "center";
        this.overSummaryContainer.style.zIndex = "2000";
        document.body.appendChild(this.overSummaryContainer);
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
        
        this.currentOverBalls.push(amount);
        this.updateDisplay();
        this.checkOverEnd();
    }

    registerWicket() {
        if (window.gamePaused) return;
        
        this.wickets += 1;
        this.totalBalls += 1;
        this.triggerAlert("BOWLED!! OUT! 🛑", "#ff3333");
        
        this.currentOverBalls.push('W');
        this.updateDisplay();
        this.checkOverEnd();
    }

    incrementBall() {
        if (window.gamePaused) return;
        this.totalBalls += 1;
        this.dotBalls += 1;
        
        this.currentOverBalls.push(0);
        this.updateDisplay();
        this.checkOverEnd();
    }

    checkOverEnd() {
        if (this.totalBalls > 0 && this.totalBalls % 6 === 0) {
            // Over completed! Show summary overlay with minor delay to let delivery resets finish
            setTimeout(() => { this.showOverSummary(); }, 800);
        }
    }

    showOverSummary() {
        window.gamePaused = true;

        const overNumber = Math.floor(this.totalBalls / 6);
        let overRuns = 0;
        let overWickets = 0;
        this.currentOverBalls.forEach(ball => {
            if (ball === 'W') overWickets++;
            else if (typeof ball === 'number') overRuns += ball;
        });

        const ballsHtml = this.currentOverBalls.map(ball => {
            let bgColor = "#444";
            let textColor = "#fff";
            let displayVal = ball;
            let glow = "none";

            if (ball === 0) {
                bgColor = "#2c3e50";
                displayVal = "•";
            } else if (ball === 4) {
                bgColor = "#d4af37";
                textColor = "#000";
                glow = "0 0 10px #d4af37";
            } else if (ball === 6) {
                bgColor = "#00ffcc";
                textColor = "#000";
                glow = "0 0 12px #00ffcc";
            } else if (ball === 'W') {
                bgColor = "#ff3333";
                glow = "0 0 10px #ff3333";
            } else {
                bgColor = "#27ae60";
            }

            return `
                <div style="
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background-color: ${bgColor};
                    color: ${textColor};
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 18px;
                    font-weight: bold;
                    margin: 0 6px;
                    box-shadow: ${glow};
                    border: 2px solid rgba(255, 255, 255, 0.1);
                ">${displayVal}</div>
            `;
        }).join('');

        this.overSummaryContainer.innerHTML = `
            <div style="
                background: linear-gradient(135deg, rgba(15, 25, 50, 0.96), rgba(5, 10, 25, 0.98));
                border: 2px solid #00ff00;
                box-shadow: 0 10px 30px rgba(0, 255, 0, 0.25);
                border-radius: 16px;
                padding: 40px;
                text-align: center;
                max-width: 480px;
                width: 90%;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #ffffff;
                animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            ">
                <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #00ff00; font-weight: bold; margin-bottom: 6px;">📊 Over Completed</div>
                <div style="font-size: 32px; font-weight: 900; margin-bottom: 24px; letter-spacing: -0.5px;">OVER ${overNumber} SUMMARY</div>
                
                <div style="display: flex; justify-content: center; margin-bottom: 30px;">
                    ${ballsHtml}
                </div>

                <div style="
                    background: rgba(255, 255, 255, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 30px;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                ">
                    <div style="text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">
                        <span style="font-size: 11px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px;">Runs Scored</span>
                        <div style="font-size: 26px; font-weight: 800; color: #00ffcc; margin-top: 4px;">+${overRuns}</div>
                    </div>
                    <div style="text-align: center;">
                        <span style="font-size: 11px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px;">Wickets Taken</span>
                        <div style="font-size: 26px; font-weight: 800; color: #ff3333; margin-top: 4px;">${overWickets}</div>
                    </div>
                    <div style="grid-column: span 2; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 15px; text-align: center;">
                        <span style="font-size: 13px; color: #aaa;">Current Match Score</span>
                        <div style="font-size: 30px; font-weight: 900; color: #ffffff; margin-top: 4px;">${this.runs} <span style="font-size: 20px; color: #ff3333; font-weight: 600;">/ ${this.wickets}</span></div>
                    </div>
                </div>

                <div id="nextOverCountdown" style="
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px dashed rgba(255, 255, 255, 0.15);
                    border-radius: 8px;
                    padding: 12px 24px;
                    font-size: 16px;
                    font-weight: 800;
                    color: #00ff00;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    display: inline-block;
                ">Starting Next Over in 5s... 🏏</div>
            </div>
        `;

        this.overSummaryContainer.style.display = "flex";

        let timeLeft = 5;
        const countdownEl = document.getElementById("nextOverCountdown");

        if (this.overTimer) {
            clearInterval(this.overTimer);
        }

        this.overTimer = setInterval(() => {
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(this.overTimer);
                this.overTimer = null;
                this.overSummaryContainer.style.display = "none";
                this.currentOverBalls = [];
                window.gamePaused = false;
            } else {
                if (countdownEl) {
                    countdownEl.innerHTML = `Starting Next Over in ${timeLeft}s... 🏏`;
                }
            }
        }, 1000);
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
        this.currentOverBalls = [];
        if (this.overSummaryContainer) {
            this.overSummaryContainer.style.display = "none";
        }
        if (this.overTimer) {
            clearInterval(this.overTimer);
            this.overTimer = null;
        }
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