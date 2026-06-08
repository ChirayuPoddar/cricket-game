/**
 * Environment UI Module
 * Responsibilities: Generating an interactive 2D HUD text layer over the WebGL canvas 
 * to track scores, wickets, and display match alerts.
 */
export default class EnvironmentUI {
    constructor(scene) {
        this.scene = scene;
        this.advancedTexture = null;
        this.scoreLabel = null;
        this.alertLabel = null;

        this.runs = 0;
        this.wickets = 0;
    }

    setup() {
        // Create Babylon's Fullscreen GUI layer
        this.advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, this.scene);

        this.createScoreboard();
        this.createAlertBanner();
    }

    createScoreboard() {
        this.scoreLabel = new BABYLON.GUI.TextBlock();
        this.scoreLabel.text = "SCORE: 0 / 0";
        this.scoreLabel.color = "white";
        this.scoreLabel.fontSize = 28;
        this.scoreLabel.fontFamily = "Impact, Arial Black, sans-serif";
        this.scoreLabel.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        this.scoreLabel.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        this.scoreLabel.left = "20px";
        this.scoreLabel.top = "20px";

        this.advancedTexture.addControl(this.scoreLabel);
    }

    createAlertBanner() {
        this.alertLabel = new BABYLON.GUI.TextBlock();
        this.alertLabel.text = "READY TO PLAY!";
        this.alertLabel.color = "#FFD700"; // Golden yellow
        this.alertLabel.fontSize = 36;
        this.alertLabel.fontFamily = "Impact, Arial Black, sans-serif";
        this.alertLabel.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        this.alertLabel.textVerticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
        this.alertLabel.top = "-150px"; // Sit comfortably above the bat viewpoint

        this.advancedTexture.addControl(this.alertLabel);
    }

    // Call this whenever the bat registers a valid strike
    addRuns(amount) {
        this.runs += amount;
        this.updateScoreDisplay();

        let messages = ["SHOT!", "FOUR RUNS!", "CRACKED AWAY!", "Smashed into the Deep!"];
        if (amount === 6) messages = ["SIXER!", "OUT OF THE PARK!", "MASSIVE MAXIMUM!"];

        this.showAlert(messages[Math.floor(Math.random() * messages.length)], "#4CAF50");
    }

    // Call this whenever the wickets are broken
    registerWicket() {
        this.wickets += 1;
        this.updateScoreDisplay();
        this.showAlert("BOWLED!! OUT!", "#F44336");
    }

    updateScoreDisplay() {
        this.scoreLabel.text = `SCORE: ${this.runs} / ${this.wickets}`;
    }

    showAlert(text, color) {
        this.alertLabel.text = text;
        this.alertLabel.color = color;

        // Quick scaling bounce animation effect
        this.alertLabel.scaleX = 1.3;
        this.alertLabel.scaleY = 1.3;

        setTimeout(() => {
            this.alertLabel.scaleX = 1.0;
            this.alertLabel.scaleY = 1.0;
        }, 150);
    }
}