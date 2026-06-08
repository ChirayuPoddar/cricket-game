/**
 * Core Engine Module
 * Responsibilities: WebGL initialization, rendering loops, and window resizing.
 */
export class GameEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.engine = null;
    }

    // Function to initialize the hardware-accelerated WebGL instance
    initialize() {
        if (!this.canvas) {
            console.error(`Canvas element with ID '${canvasId}' not found.`);
            return null;
        }

        // Initialize Babylon engine with antialiasing turned on for smooth edges
        this.engine = new BABYLON.Engine(this.canvas, true, { antialias: true });
        this.setupResizeListener();

        return this.engine;
    }

    // Function to handle browser resizing automatically
    setupResizeListener() {
        window.addEventListener("resize", () => {
            if (this.engine) {
                this.engine.resize();
            }
        });
    }

    // Function to start drawing frames onto the screen
    startRenderLoop(scene) {
        this.engine.runRenderLoop(() => {
            if (scene) {
                scene.render();
            }
        });
    }
}