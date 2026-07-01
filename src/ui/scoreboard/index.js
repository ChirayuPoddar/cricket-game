import EventBus from '../../core/EventBus.js';
import { createDOMElements } from './elements.js';
import { showOverSummary } from './overSummary.js';
import { showTimingMeter } from './timingMeter.js';

export default class GameUI {
    constructor() {
        this.runs = 0;
        this.wickets = 0;
        this.totalBalls = 0;
        this.fours = 0;
        this.sixes = 0;
        this.dotBalls = 0;
        this.currentOverBalls = [];

        this.scoreContainer = null;
        this.alertContainer = null;
        this.statsContainer = null;
        this.overSummaryContainer = null;
        this.timingMeterContainer = null;

        this.gameStartTime = null;
        this.overTimer = null;
        this.deliveryTimer = null;
    }

    setup(onToggleMode) {
        createDOMElements(this, onToggleMode);
        this.gameStartTime = Date.now();
        this.updateDisplay();
        this.setupEventListeners();
    }

    setupEventListeners() {
        EventBus.on(EventBus.GAME_EVENTS.SHOT_PLAYED, (data) => {});
        EventBus.on(EventBus.GAME_EVENTS.BOUNDARY_FOUR, (data) => {});
        EventBus.on(EventBus.GAME_EVENTS.BOUNDARY_SIX, (data) => {});
        EventBus.on(EventBus.GAME_EVENTS.RUNS_SCORED, (data) => {});
        EventBus.on(EventBus.GAME_EVENTS.WICKET_DOWN, (data) => {});
    }

    addRuns(amount) {
        if (window.gamePaused) return;

        this.runs += amount;
        this.totalBalls += 1;

        if (amount === 6) {
            this.sixes += 1;
        } else if (amount === 4) {
            this.fours += 1;
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
            setTimeout(() => { this.showOverSummary(); }, 800);
        }
    }

    showOverSummary() {
        showOverSummary(this);
    }

    showTimingMeter(timingDiff, timingText, noSwing = false, outcomeText = "", outcomeColor = "#ffffff", contactPos = null, finalPos = null) {
        showTimingMeter(this, timingDiff, timingText, noSwing, outcomeText, outcomeColor, contactPos, finalPos);
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

        if (this.scoreContainer) {
            this.scoreContainer.innerHTML = `
                <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #aaa; margin-bottom: 4px;">🏏 Live Match Score</div>
                <div style="font-size: 36px; line-height: 38px;">${this.runs} <span style="font-size: 24px; color: #ff3333;">/ ${this.wickets}</span></div>
                <div style="font-size: 16px; color: #8cd6ff; margin-top: 6px; font-weight: 500;">Overs: ${completedOvers}.${remainingBalls}</div>
                <div style="font-size: 12px; color: #aaa; margin-top: 4px;">Strike Rate: ${strikeRate}%</div>
            `;
        }

        if (this.statsContainer) {
            this.statsContainer.innerHTML = `
                <div style="font-size: 12px; font-weight: bold; margin-bottom: 6px;">📊 Match Statistics</div>
                <div>4️⃣ Fours: ${this.fours} | 6️⃣ Sixes: ${this.sixes}</div>
                <div>⚪ Dots: ${this.dotBalls} | 📍 Balls: ${this.totalBalls}</div>
            `;
        }
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
