/**
 * Environment Bat Module
 * Responsibilities: Creating a structurally locked visual bat, executing 
 * direction-accurate mouse tracking, detecting cursor placement on click,
 * and dynamically mapping different cricket strokes (Pull, Drive, Loft).
 */
export default class EnvironmentBat {
    constructor(scene) {
        this.scene = scene;
        this.batGroup = null;
        this.batMesh = null;
        this.handleMesh = null;
        this.isSwinging = false;

        // Base ready stance values
        this.READY_ROTATION_X = 0.3;
        this.READY_ROTATION_Y = 0.0;
        this.READY_ROTATION_Z = -0.4;
    }

    setup() {
        this.createBatStructure();
        this.attachPointerTracking();
        this.attachClickTrigger();

        return this.batGroup;
    }

    createBatStructure() {
        // Create the core pivot anchor node at the batsman crease line
        this.batGroup = new BABYLON.TransformNode("batGroupAnchor", this.scene);
        this.batGroup.position = new BABYLON.Vector3(0, 1.0, 7.8);

        // 1. Blade Geometry
        this.batMesh = BABYLON.MeshBuilder.CreateBox("cricketBatBlade", {
            width: 0.12,
            height: 0.9,
            depth: 0.05
        }, this.scene);
        this.batMesh.parent = this.batGroup;
        this.batMesh.position = new BABYLON.Vector3(0, -0.45, 0);

        // 2. Handle Geometry
        this.handleMesh = BABYLON.MeshBuilder.CreateCylinder("cricketBatHandle", {
            diameterTop: 0.03,
            diameterBottom: 0.03,
            height: 0.35
        }, this.scene);
        this.handleMesh.parent = this.batGroup;
        this.handleMesh.position = new BABYLON.Vector3(0, 0.175, 0);

        // Material application
        const woodMat = new BABYLON.StandardMaterial("batWoodMaterial", this.scene);
        woodMat.diffuseColor = new BABYLON.Color3(0.75, 0.58, 0.41);
        this.batMesh.material = woodMat;

        const gripMat = new BABYLON.StandardMaterial("batGripMaterial", this.scene);
        gripMat.diffuseColor = new BABYLON.Color3(0.12, 0.12, 0.12);
        this.handleMesh.material = gripMat;

        this.resetToReadyStance();
    }

    resetToReadyStance() {
        this.batGroup.rotation.x = this.READY_ROTATION_X;
        this.batGroup.rotation.y = this.READY_ROTATION_Y;
        this.batGroup.rotation.z = this.READY_ROTATION_Z;
    }

    attachPointerTracking() {
        this.scene.onPointerMove = (evt, pickResult) => {
            if (this.isSwinging) return;

            const canvasWidth = this.scene.getEngine().getRenderWidth();
            const canvasHeight = this.scene.getEngine().getRenderHeight();

            const targetX = -((this.scene.pointerX / canvasWidth) - 0.5) * 2.8;
            const targetY = (1.0 - (this.scene.pointerY / canvasHeight)) * 2.2 + 0.2;

            this.batGroup.position.x = BABYLON.Scalar.Lerp(this.batGroup.position.x, targetX, 0.2);
            this.batGroup.position.y = BABYLON.Scalar.Lerp(this.batGroup.position.y, targetY, 0.2);
        };
    }

    /**
     * Dynamically generates and executes an animation based on screen coordinates
     */
    executeDynamicShot(mouseX, mouseY) {
        this.isSwinging = true;

        // Create keyframe animation tracks for all 3 axes to enable advanced 3D motions
        const animX = new BABYLON.Animation("swingX", "rotation.x", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        const animY = new BABYLON.Animation("swingY", "rotation.y", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
        const animZ = new BABYLON.Animation("swingZ", "rotation.z", 60, BABYLON.Animation.ANIMATIONTYPE_FLOAT, BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);

        let keysX = [], keysY = [], keysZ = [];
        let strokeLabel = "STRAIGHT DRIVE";

        // --- SHOT MATRICES SELECTION ---
        if (mouseY > 1.4 && Math.abs(mouseX) > 0.4) {
            // 1. PULL SHOT (High click setup: Horizontal cross-batted swing)
            strokeLabel = "AGGRESSIVE PULL SHOT 🏏";

            keysX = [{ frame: 0, value: this.READY_ROTATION_X }, { frame: 10, value: 0.2 }, { frame: 20, value: 1.4 }, { frame: 45, value: this.READY_ROTATION_X }];
            keysY = [{ frame: 0, value: this.READY_ROTATION_Y }, { frame: 10, value: -0.5 }, { frame: 20, value: 2.2 }, { frame: 45, value: this.READY_ROTATION_Y }];
            keysZ = [{ frame: 0, value: this.READY_ROTATION_Z }, { frame: 10, value: 0.4 }, { frame: 20, value: -1.0 }, { frame: 45, value: this.READY_ROTATION_Z }];

        } else if (mouseY <= 1.0 && Math.abs(mouseX) > 0.5) {
            // 2. COVER DRIVE / SQUARE CUT (Low & wide click setup: Angled elegant slice)
            strokeLabel = "CLASSIC COVER DRIVE ✨";

            keysX = [{ frame: 0, value: this.READY_ROTATION_X }, { frame: 12, value: 0.8 }, { frame: 22, value: -0.4 }, { frame: 45, value: this.READY_ROTATION_X }];
            keysY = [{ frame: 0, value: this.READY_ROTATION_Y }, { frame: 12, value: mouseX > 0 ? 0.6 : -0.6 }, { frame: 22, value: mouseX > 0 ? -0.8 : 0.8 }, { frame: 45, value: this.READY_ROTATION_Y }];
            keysZ = [{ frame: 0, value: this.READY_ROTATION_Z }, { frame: 12, value: 0.2 }, { frame: 22, value: -1.9 }, { frame: 45, value: this.READY_ROTATION_Z }];

        } else {
            // 3. LOFTED STRAIGHT DRIVE (Center/Default click setup: High straight follow-through)
            strokeLabel = "LOFTED STRAIGHT DRIVE 🚀";

            keysX = [{ frame: 0, value: this.READY_ROTATION_X }, { frame: 10, value: -0.4 }, { frame: 18, value: 1.8 }, { frame: 45, value: this.READY_ROTATION_X }];
            keysY = [{ frame: 0, value: this.READY_ROTATION_Y }, { frame: 10, value: 0.0 }, { frame: 18, value: 0.0 }, { frame: 45, value: this.READY_ROTATION_Y }];
            keysZ = [{ frame: 0, value: this.READY_ROTATION_Z }, { frame: 10, value: 0.6 }, { frame: 18, value: -1.8 }, { frame: 45, value: this.READY_ROTATION_Z }];
        }

        // Apply keys to active track columns
        animX.setKeys(keysX);
        animY.setKeys(keysY);
        animZ.setKeys(keysZ);

        this.batGroup.animations = [animX, animY, animZ];

        // Print active executed shot label to developer console console logs
        console.log(`Executed Stroke: ${strokeLabel}`);

        // Fire all three axes channels simultaneously
        this.scene.beginAnimation(this.batGroup, 0, 45, false, 1.8, () => {
            this.isSwinging = false;
            this.resetToReadyStance();
        });
    }

    attachClickTrigger() {
        this.scene.onPointerDown = (evt) => {
            if (evt.button === 0 && !this.isSwinging) {
                // Pass current position values to decide the shot profile dynamically
                this.executeDynamicShot(this.batGroup.position.x, this.batGroup.position.y);
            }
        };
    }
}