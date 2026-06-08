/**
 * Environment Lights Module
 * Responsibilities: Setting up the ambient stadium environment light and directional sun shadows.
 */
export default class EnvironmentLights {
    constructor(scene) {
        this.scene = scene;
        this.ambientLight = null;
        this.sunLight = null;
        this.shadowGenerator = null;
    }

    setup() {
        this.createAmbientLight();
        this.createSunLight();
        this.createShadows();

        return {
            ambientLight: this.ambientLight,
            sunLight: this.sunLight,
            shadowGenerator: this.shadowGenerator
        };
    }

    createAmbientLight() {
        this.ambientLight = new BABYLON.HemisphericLight("stadiumAmbient", new BABYLON.Vector3(0, 1, 0), this.scene);
        this.ambientLight.intensity = 0.4;
        this.ambientLight.groundColor = new BABYLON.Color3(0.2, 0.4, 0.2);
    }

    createSunLight() {
        this.sunLight = new BABYLON.DirectionalLight("stadiumSun", new BABYLON.Vector3(-1, -2, -1), this.scene);
        this.sunLight.position = new BABYLON.Vector3(10, 20, 10);
        this.sunLight.intensity = 0.8;
    }

    createShadows() {
        this.shadowGenerator = new BABYLON.ShadowGenerator(1024, this.sunLight);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.blurKernel = 32;
    }
}