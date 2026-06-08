/**
 * Environment Sky Module
 * Responsibilities: Generating a panoramic sky dome that renders textures on its interior faces.
 */
export default class EnvironmentSky {
    constructor(scene) {
        this.scene = scene;
        this.skyMesh = null;
    }

    setup() {
        this.createSkyDome();
        this.applySkyMaterial();
    }

    createSkyDome() {
        // Increase diameter to 500 meters so the camera is comfortably resting inside it
        this.skyMesh = BABYLON.MeshBuilder.CreateSphere("skyDome", {
            diameter: 500,
            segments: 32 // More segments make the sky sphere look perfectly smooth
        }, this.scene);

        // Center it completely at the middle of the pitch
        this.skyMesh.position = new BABYLON.Vector3(0, 0, 0);
    }

    applySkyMaterial() {
        const skyMaterial = new BABYLON.StandardMaterial("skyMaterial", this.scene);

        // 1. CRITICAL: Force the material to render on the inside faces of the sphere
        skyMaterial.backFaceCulling = false;

        // 2. Turn off light reflections so the sky shines evenly like an atmosphere
        skyMaterial.disableLighting = true;

        // 3. Set a vibrant day-sky blue tone
        skyMaterial.emissiveColor = new BABYLON.Color3(0.4, 0.6, 0.9);

        this.skyMesh.material = skyMaterial;

        // 4. Set infinite distance so moving the camera doesn't let you run out of bounds
        this.skyMesh.infiniteDistance = true;
    }
}