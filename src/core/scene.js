/**
 * Core Scene Module
 * Responsibilities: Creating the 3D world container and setting cosmic background parameters.
 */
export class GameScene {
    constructor(engine) {
        this.engine = engine;
        this.scene = null;
    }

    // Function to construct a fresh, empty 3D scene
    create() {
        this.scene = new BABYLON.Scene(this.engine);
        this.configureEnvironment();

        return this.scene;
    }

    // Function to set up the default baseline environment states
    configureEnvironment() {
        // Set a very dark, slightly blue atmosphere (RGB values + Alpha)
        this.scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.08, 1.0);
    }
}