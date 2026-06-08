/**
 * Environment Camera Module
 * Responsibilities: Instantiating the user's viewpoint camera and configuring movement inputs.
 */
export default class EnvironmentCamera {
    constructor(scene, canvas) {
        this.scene = scene;
        this.canvas = canvas;
        this.camera = null;
    }

    setup() {
        this.createCamera();
        this.positionCamera();
        this.attachControls();

        return this.camera;
    }

    createCamera() {
        this.camera = new BABYLON.FreeCamera("mainViewportCamera", BABYLON.Vector3.Zero(), this.scene);
    }

    positionCamera() {
        // Positioned close to frame everything beautifully
        this.camera.position = new BABYLON.Vector3(0, 1.2, 7);
        this.camera.setTarget(new BABYLON.Vector3(0, 0.5, 10));
    }

    attachControls() {
        this.camera.attachControl(this.canvas, true);
    }
}