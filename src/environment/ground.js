/**
 * Environment Ground Module
 * Responsibilities: Creating the massive green outfield turf and the central rectangular clay pitch.
 */
export default class EnvironmentGround {
    constructor(scene) {
        this.scene = scene;
        this.outfieldMesh = null;
        this.pitchMesh = null;
    }

    setup() {
        this.createOutfield();
        this.createPitch();
    }

    createOutfield() {
        this.outfieldMesh = BABYLON.MeshBuilder.CreateGround("outfieldTurf", { width: 90, height: 1500 }, this.scene);

        const outfieldMaterial = new BABYLON.StandardMaterial("outfieldMat", this.scene);
        outfieldMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.65, 0.3); // Lush grass green
        outfieldMaterial.specularColor = BABYLON.Color3.Black(); // No plastic shine on grass

        this.outfieldMesh.material = outfieldMaterial;
        this.outfieldMesh.receiveShadows = true;
    }

    createPitch() {
        this.pitchMesh = BABYLON.MeshBuilder.CreateGround("clayPitch", { width: 3, height: 25 }, this.scene);
        this.pitchMesh.position.y = 0.001; // Elevate slightly above grass to prevent texture flickering

        const pitchMaterial = new BABYLON.StandardMaterial("pitchMat", this.scene);
        pitchMaterial.diffuseColor = new BABYLON.Color3(0.92, 0.85, 0.62); // Hard baked clay pitch tone
        pitchMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        this.pitchMesh.material = pitchMaterial;
        this.pitchMesh.receiveShadows = true;
    }
}