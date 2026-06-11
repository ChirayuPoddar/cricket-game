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
            console.error(`Canvas element not found.`);
            return null;
        }

        // Temporarily suppress console.log to skip the Babylon.js startup brand print
        const originalLog = console.log;
        console.log = () => {};

        // Initialize Babylon engine with high performance settings and discrete GPU request
        this.engine = new BABYLON.Engine(this.canvas, true, { 
            antialias: true,
            powerPreference: "high-performance"
        });

        // Restore console.log immediately
        console.log = originalLog;

        // Render at native physical display resolution (Retina/High-DPI 1:1 pixel mapping)
        const devicePixelRatio = window.devicePixelRatio || 1;
        this.engine.setHardwareScalingLevel(1.0 / devicePixelRatio);

        // Enable 16x anisotropic filtering globally for crisp textures at all viewing angles
        BABYLON.Texture.DefaultAnisotropicFilteringLevel = 16;

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
    startRenderLoop(scene, perfMonitor = null) {
        this.engine.runRenderLoop(() => {
            if (scene) {
                scene.render();
            }
            // Update performance monitor every frame if available
            if (perfMonitor) {
                perfMonitor.update({ fps: this.engine.getFps(), isRunning: true });
            }
        });
    }
}