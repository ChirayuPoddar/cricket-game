/**
 * Environment Sky Module
 * Responsibilities: Generating a panoramic sky dome and adapting colors between Day and Night settings.
 */
export default class EnvironmentSky {
    constructor(scene) {
        this.scene = scene;
        this.skyMesh = null;
    }

    setup() {
        this.createSkyDome();
        this.applySkyMaterial();
        
        // Initial theme paint (Day settings by default)
        this.applyTheme(true);
    }

    createSkyDome() {
        this.skyMesh = BABYLON.MeshBuilder.CreateSphere("skyDome", {
            diameter: 500,
            segments: 32
        }, this.scene);
        this.skyMesh.position = new BABYLON.Vector3(0, 0, 0);
    }

    applySkyMaterial() {
        const skyMaterial = new BABYLON.StandardMaterial("skyMaterial", this.scene);
        skyMaterial.backFaceCulling = false;
        skyMaterial.disableLighting = true;

        // Initializing default Day-Sky Blue color tint
        skyMaterial.emissiveColor = new BABYLON.Color3(0.4, 0.6, 0.9);

        this.skyMesh.material = skyMaterial;
        this.skyMesh.infiniteDistance = true;
    }

    /**
     * Switches the atmosphere environment color instantly
     */
    applyTheme(isDayMode) {
        if (this.skyMesh && this.skyMesh.material) {
            this.skyMesh.material.emissiveColor = isDayMode ?
                new BABYLON.Color3(0.4, 0.6, 0.9) : // Vibrant Blue
                new BABYLON.Color3(0.01, 0.01, 0.04); // Deep Midnight Blue
        }
    }
}