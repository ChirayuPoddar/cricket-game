// src/environment/camera.js
export default class EnvironmentCamera {
    constructor(scene, canvas) {
        this.scene = scene;
        this.canvas = canvas;
        this.camera = null;

        // Camera positioning configurations (Z = 7.5 is exactly in front of stumps at Z = 8.2)
        this.defaultPosition = new BABYLON.Vector3(0, 1.4, 7.5);
        this.defaultTarget = new BABYLON.Vector3(0, 0.8, -10);

        this.targetBallMesh = null;
        this.isTrackingBall = false;
        this.trackingSmoothness = 0.08; // Interpolation speed (LERP)
        this.handGroup = null;
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
     * Store handGroup reference but do not parent camera to avoid rendering issues
     */
    setHandGroup(handGroup) {
        this.handGroup = handGroup;
        if (this.camera) {
            this.camera.parent = null;
            this.camera.position.copyFrom(this.defaultPosition);
            this.camera.setTarget(this.defaultTarget.clone());
        }
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
        if (this.camera) {
            this.camera.parent = null;
            this.camera.position.copyFrom(this.defaultPosition);
            this.camera.setTarget(this.defaultTarget.clone());
        }
    }

    registerDynamicTrackingLoop() {
        this.scene.onBeforeRenderObservable.add(() => {
            if (this.scene.activeCamera !== this.camera) return;
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

    enableFreeRoam(enable) {
        if (enable) {
            if (!this.freeRoamCamera) {
                this.freeRoamCamera = new BABYLON.FreeCamera("freeRoamCamera", this.camera.position.clone(), this.scene);
                
                // Clear and re-add standard inputs for absolute reliability
                this.freeRoamCamera.inputs.clear();
                this.freeRoamCamera.inputs.addKeyboard();
                this.freeRoamCamera.inputs.addMouse();

                this.freeRoamCamera.keysUp = [38, 87];         // ArrowUp, W
                this.freeRoamCamera.keysDown = [40, 83];       // ArrowDown, S
                this.freeRoamCamera.keysLeft = [37, 65];       // ArrowLeft, A
                this.freeRoamCamera.keysRight = [39, 68];      // ArrowRight, D
                this.freeRoamCamera.keysUpward = [69];         // E (fly up)
                this.freeRoamCamera.keysDownward = [81];       // Q (fly down)
                
                this.freeRoamCamera.speed = 2.0;               // Faster speed for large stadium
                this.freeRoamCamera.angularSensibility = 1000; // Mouse sensitivity
            }

            // Sync free camera position and orientation with the main camera
            this.freeRoamCamera.position.copyFrom(this.camera.position);
            this.freeRoamCamera.setTarget(this.camera.getTarget().clone());

            // Switch to free camera
            this.camera.detachControl(this.canvas);
            this.scene.activeCamera = this.freeRoamCamera;
            this.freeRoamCamera.attachControl(this.canvas, true);
        } else {
            // Restore main camera
            if (this.freeRoamCamera) {
                this.freeRoamCamera.detachControl(this.canvas);
            }
            this.scene.activeCamera = this.camera;
            this.camera.attachControl(this.canvas, true);
        }
    }
}