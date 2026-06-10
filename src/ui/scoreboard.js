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

        // 4. Create the Timing Meter fullscreen overlay modal
        this.timingMeterContainer = document.createElement("div");
        this.timingMeterContainer.id = "timingMeterContainer";
        this.timingMeterContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(5, 10, 25, 0.6);
            backdrop-filter: blur(5px);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1999;
            pointer-events: none;
            user-select: none;
        `;
        document.body.appendChild(this.timingMeterContainer);
    }

    addRuns(amount) {
        if (window.gamePaused) return;
        
        this.runs += amount;
        this.totalBalls += 1;

        if (amount === 6) {
            this.sixes += 1;
            // Removed center alert in favor of unified top-center meter
        } else if (amount === 4) {
            this.fours += 1;
            // Removed center alert in favor of unified top-center meter
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
        // Removed center alert in favor of unified top-center meter
        
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
        this.hideTimingMeter();
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

    showTimingMeter(timingDiff, timingText, noSwing = false, outcomeText = "", outcomeColor = "#ffffff", contactPos = null, finalPos = null) {
        if (!this.timingMeterContainer) return;

        const numColumns = 21;
        let activeIndex = 10; // default to center

        if (!noSwing) {
            // Map timingDiff (from -250ms to +250ms) to 0-20 index
            // Negative diff = Early, Positive diff = Late
            const clampedDiff = Math.max(-250, Math.min(250, timingDiff));
            activeIndex = Math.round(((clampedDiff + 250) / 500) * (numColumns - 1));
        }

        // Generate columns HTML forming a symmetric arch gradient
        let colsHtml = '';
        for (let i = 0; i < numColumns; i++) {
            const distanceFromCenter = Math.abs(i - 10);
            const height = 30 - distanceFromCenter * 1.8;

            let colColor = "#00f5d4"; // Center: Cyan/Green
            if (i <= 3 || i >= 17) {
                colColor = "#ff007f"; // Edges: Pink/Magenta
            } else if (i <= 7 || i >= 13) {
                colColor = "#9b5de5"; // Mid: Purple
            }

            const isIndicator = i === activeIndex && !noSwing;
            const finalBgColor = isIndicator ? "#000000" : colColor;
            const finalBorder = isIndicator ? "2px solid #ffffff" : "none";
            const finalShadow = isIndicator ? "0 0 8px rgba(255,255,255,0.8)" : "none";

            colsHtml += `
                <div style="
                    width: 6px;
                    height: ${height}px;
                    background-color: ${finalBgColor};
                    border: ${finalBorder};
                    box-shadow: ${finalShadow};
                    margin: 0 2px;
                    border-radius: 2px;
                    transition: all 0.2s ease;
                "></div>
            `;
        }

        let labelBgColor = "rgba(80, 80, 80, 0.9)";
        let labelTextColor = "#ffffff";
        if (timingText === "PERFECT") {
            labelBgColor = "rgba(0, 245, 212, 0.95)";
            labelTextColor = "#000000";
        } else if (timingText === "GOOD") {
            labelBgColor = "rgba(155, 93, 229, 0.95)";
        } else if (timingText === "EARLY" || timingText === "LATE") {
            labelBgColor = "rgba(255, 0, 127, 0.95)";
        } else if (timingText === "TOO EARLY" || timingText === "TOO LATE") {
            labelBgColor = "rgba(255, 0, 127, 0.95)";
        }

        let radarHtml = "";
        if (contactPos && finalPos) {
            radarHtml = `
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8cd6ff; margin: 10px 0 5px 0; font-weight: bold;">Shot Trajectory Map</div>
                <canvas id="wagonWheelCanvas" width="260" height="260" style="
                    background: rgba(0, 0, 0, 0.4);
                    border: 2px dashed rgba(0, 255, 200, 0.25);
                    border-radius: 50%;
                    margin-bottom: 15px;
                    box-shadow: 0 0 15px rgba(0, 255, 200, 0.1);
                "></canvas>
            `;
        }

        this.timingMeterContainer.innerHTML = `
            <div style="
                background: linear-gradient(135deg, rgba(15, 25, 50, 0.96), rgba(5, 10, 25, 0.98));
                border: 2px solid ${outcomeColor};
                box-shadow: 0 10px 30px ${outcomeColor}40;
                border-radius: 16px;
                padding: 30px;
                text-align: center;
                max-width: 460px;
                width: 90%;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #ffffff;
                animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                display: flex;
                flex-direction: column;
                align-items: center;
            ">
                <div style="
                    font-size: 28px;
                    font-weight: 900;
                    color: ${outcomeColor};
                    text-transform: uppercase;
                    margin-bottom: 10px;
                    letter-spacing: 2px;
                    text-shadow: 0 0 12px ${outcomeColor}50;
                ">${outcomeText}</div>
                
                ${radarHtml}

                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #aaa; margin: 5px 0 10px 0; font-weight: bold;">Swing Timing Feedback</div>
                
                <div style="
                    display: flex;
                    align-items: flex-end;
                    height: 35px;
                    padding: 0 10px;
                    margin-bottom: 12px;
                ">
                    ${colsHtml}
                </div>
                
                <div style="
                    background: ${labelBgColor};
                    color: ${labelTextColor};
                    padding: 6px 22px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.15);
                    margin-bottom: 20px;
                ">${timingText}</div>

                <div id="deliveryCountdown" style="
                    font-size: 12px;
                    color: #8cd6ff;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                ">Next delivery in 3s...</div>
            </div>
        `;

        this.timingMeterContainer.style.display = "flex";
        this.timingMeterContainer.style.animation = "modalFadeIn 0.2s ease-out";

        // Draw Wagon Wheel Radar
        if (contactPos && finalPos) {
            const canvas = document.getElementById("wagonWheelCanvas");
            if (canvas) {
                const ctx = canvas.getContext("2d");
                const w = canvas.width;
                const h = canvas.height;
                const cx = w / 2;
                const cy = h / 2;
                const r = w / 2 - 8;

                ctx.clearRect(0, 0, w, h);

                // 1. Draw outer boundary circle
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, 2 * Math.PI);
                ctx.strokeStyle = "rgba(0, 255, 200, 0.4)";
                ctx.lineWidth = 2;
                ctx.stroke();

                // 2. Draw 30-yard inner circle (dashed)
                ctx.beginPath();
                ctx.arc(cx, cy, r * 0.6, 0, 2 * Math.PI);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 6]);
                ctx.stroke();
                ctx.setLineDash([]); // Reset dashed lines

                // 3. Draw 45-degree sector dividers (dashed)
                ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 8]);
                for (let angleDeg = 0; angleDeg < 360; angleDeg += 45) {
                    const rad = angleDeg * Math.PI / 180;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
                    ctx.stroke();
                }
                ctx.setLineDash([]); // Reset dashed lines

                // 4. Draw pitch rectangle in the center
                ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
                ctx.fillRect(cx - 4, cy - 30, 8, 60);

                // 5. Draw stumps/wickets icons at batsman and bowler crease
                ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
                ctx.lineWidth = 1;
                
                // Batsman crease wickets (downside)
                ctx.beginPath();
                ctx.moveTo(cx - 3, cy + 30); ctx.lineTo(cx - 3, cy + 24);
                ctx.moveTo(cx, cy + 30);     ctx.lineTo(cx, cy + 24);
                ctx.moveTo(cx + 3, cy + 30); ctx.lineTo(cx + 3, cy + 24);
                ctx.moveTo(cx - 4, cy + 24); ctx.lineTo(cx + 4, cy + 24);
                ctx.stroke();

                // Bowler crease wickets (topside)
                ctx.beginPath();
                ctx.moveTo(cx - 3, cy - 30); ctx.lineTo(cx - 3, cy - 24);
                ctx.moveTo(cx, cy - 30);     ctx.lineTo(cx, cy - 24);
                ctx.moveTo(cx + 3, cy - 30); ctx.lineTo(cx + 3, cy - 24);
                ctx.moveTo(cx - 4, cy - 24); ctx.lineTo(cx + 4, cy - 24);
                ctx.stroke();

                // 6. Draw batsman spot in center
                ctx.beginPath();
                ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
                ctx.fillStyle = "#ffffff";
                ctx.fill();

                // 7. Direction and boundary texts (left = LEG, right = OFF, top = BOWLER, bottom = WICKETS)
                ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                ctx.font = "bold 9px 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                
                // Sides
                ctx.fillText("LEG SIDE", cx - 95, cy);
                ctx.fillText("OFF SIDE", cx + 95, cy);

                // Ends
                ctx.fillText("BOWLER", cx, cy - r + 15);
                ctx.fillText("WICKETS", cx, cy + r - 15);

                // 8. Calculate path line (invert dx to mirror X-axis to screen space)
                const dx = -(finalPos.x - contactPos.x);
                const dz = finalPos.z - contactPos.z;
                const maxLen = 40; // boundary radius
                const len = Math.sqrt(dx * dx + dz * dz);
                const scale = Math.min(1.0, len / maxLen) * r;

                const angle = Math.atan2(-dz, dx); // -dz so Z goes forward (UP on canvas)
                const targetX = cx + Math.cos(angle) * scale;
                const targetY = cy - Math.sin(angle) * scale;

                // 9. Draw path line (glowing shot line)
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(targetX, targetY);
                ctx.strokeStyle = outcomeColor;
                ctx.lineWidth = 3.5;
                ctx.lineCap = "round";
                ctx.shadowColor = outcomeColor;
                ctx.shadowBlur = 10;
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow

                // 10. Draw endpoint dot & glowing ripple circle
                ctx.beginPath();
                ctx.arc(targetX, targetY, 6, 0, 2 * Math.PI);
                ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(targetX, targetY, 3.5, 0, 2 * Math.PI);
                ctx.fillStyle = "#ffffff";
                ctx.fill();
            }
        }

        // Setup the 3-second countdown timer
        let timeLeft = 3;
        const countdownEl = document.getElementById("deliveryCountdown");

        if (this.deliveryTimer) {
            clearInterval(this.deliveryTimer);
        }

        this.deliveryTimer = setInterval(() => {
            if (window.gamePaused) return; // do not decrement while game is paused
            timeLeft--;
            if (timeLeft <= 0) {
                clearInterval(this.deliveryTimer);
                this.deliveryTimer = null;
                this.timingMeterContainer.style.display = "none";
            } else {
                if (countdownEl) {
                    countdownEl.innerHTML = `Next delivery in ${timeLeft}s...`;
                }
            }
        }, 1000);
    }

    hideTimingMeter() {
        if (this.timingMeterContainer) {
            this.timingMeterContainer.style.display = "none";
        }
        if (this.deliveryTimer) {
            clearInterval(this.deliveryTimer);
            this.deliveryTimer = null;
        }
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