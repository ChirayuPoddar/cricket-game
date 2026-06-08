/**
 * Environment Bat Module
 * Responsibilities: Generating a 2-piece composite cricket bat (Blade + Handle)
 * and binding its motion smoothly to the user's cursor.
 */
export default class EnvironmentBat {
    constructor(scene) {
        this.scene = scene;
        this.batGroup = null;
    }

    setup() {
        this.batGroup = new BABYLON.TransformNode("cricketBatGroup", this.scene);
        this.createBatPieces();
        this.registerPhysicsTracking();
        return this.batGroup;
    }

    createBatPieces() {
        const blade = BABYLON.MeshBuilder.CreateBox("batBlade", {
            width: 0.11,
            height: 0.60,
            depth: 0.05
        }, this.scene);
        blade.position.y = 0.3;

        const bladeMaterial = new BABYLON.StandardMaterial("bladeMat", this.scene);
        bladeMaterial.diffuseColor = new BABYLON.Color3(0.85, 0.72, 0.52);
        bladeMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        blade.material = bladeMaterial;

        const handle = BABYLON.MeshBuilder.CreateCylinder("batHandle", {
            diameterTop: 0.03,
            diameterBottom: 0.03,
            height: 0.35
        }, this.scene);
        handle.position.y = 0.775;

        const handleMaterial = new BABYLON.StandardMaterial("handleMat", this.scene);
        handleMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        handle.material = handleMaterial;

        blade.setParent(this.batGroup);
        handle.setParent(this.batGroup);

        this.batGroup.scaling = new BABYLON.Vector3(0.9, 0.9, 0.9);
        this.batGroup.position = new BABYLON.Vector3(0, 0.6, 7.8);
    }

    registerPhysicsTracking() {
        this.scene.onPointerMove = (evt) => {
            const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
            if (pickResult.hit && pickResult.pickedPoint) {
                this.batGroup.position.x = pickResult.pickedPoint.x;
                const targetY = pickResult.pickedPoint.y + 0.6;
                this.batGroup.position.y = Math.max(0.4, Math.min(targetY, 1.2));
            }
        };
    }
}