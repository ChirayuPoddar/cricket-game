// src/environment/camera.js
export default class EnvironmentCamera {
    constructor(scene, canvas) {
        this.scene = scene;
        this.canvas = canvas;
        this.camera = null;

        // Camera positioning configurations
        this.defaultPosition = new BABYLON.Vector3(0, 1.4, 10);
        this.defaultTarget = new BABYLON.Vector3(0, 0.8, -10);

        this.targetBallMesh = null;
        this.isTrackingBall = false;
        this.trackingSmoothness = 0.08; // Interpolation speed (LERP)
    }

    setup() {
        this.createCamera();
        this.positionCamera();
        this.attachControls();
        this.registerDynamicTrackingLoop();

        return this.camera;
    }

    createCamera() {
        // Using a FreeCamera as our core vehicle
        this.camera = new BABYLON.FreeCamera("mainViewportCamera", this.defaultPosition.clone(), this.scene);
    }

    positionCamera() {
        this.camera.position.copyFrom(this.defaultPosition);
        this.camera.setTarget(this.defaultTarget.clone());
    }

    attachControls() {
        this.camera.attachControl(this.canvas, true);

        // Remove default arrow key mapping so the camera doesn't fly away when using key inputs
        this.camera.keysUp = [];
        this.camera.keysDown = [];
        this.camera.keysLeft = [];
        this.camera.keysRight = [];
    }

    /**
     * Connects the ball reference to the camera module
     */
    setBallReference(ballMesh) {
        this.targetBallMesh = ballMesh;
    }

    /**
     * Activates automatic tracking mode when a shot is played
     */
    startTracking() {
        this.isTrackingBall = true;
    }

    /**
     * Instantly snaps the camera back into batsman view for a fresh delivery
     */
    resetToStance() {
        this.isTrackingBall = false;
        this.camera.position.copyFrom(this.defaultPosition);
        this.camera.setTarget(this.defaultTarget.clone());
    }

    registerDynamicTrackingLoop() {
        this.scene.onBeforeRenderObservable.add(() => {
            if (!this.isTrackingBall || !this.targetBallMesh) return;

            const ballPos = this.targetBallMesh.position;

            // Dynamic broadcast view: Follows the ball from slightly above and behind its flight path
            const desiredCameraPos = new BABYLON.Vector3(
                ballPos.x * 0.5,
                Math.max(3.0, ballPos.y + 2.5),
                ballPos.z - 5
            );

            // Interpolate position smoothly
            this.camera.position = BABYLON.Vector3.Lerp(this.camera.position, desiredCameraPos, this.trackingSmoothness);

            // Keep focal lens locked onto the ball
            this.camera.setTarget(ballPos);
        });
    }
}