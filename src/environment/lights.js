export default class EnvironmentLights {
    constructor(scene) {
        this.scene = scene;
        this.ambientLight = null;
        this.sunLight = null;
        this.shadowGenerator = null;
        this.floodlights = [];
    }

    setup() {
        this.createAmbientLight();
        this.createSunLight();
        this.createNightFloodlights();

        // Ensure Babylon processes enough lights for the field
        this.scene.materials.forEach(mat => {
            mat.maxSimultaneousLights = 8;
        });

        return {
            ambientLight: this.ambientLight,
            sunLight: this.sunLight,
            shadowGenerator: this.createShadows()
        };
    }

    createAmbientLight() {
        this.ambientLight = new BABYLON.HemisphericLight("stadiumAmbient", new BABYLON.Vector3(0, 1, 0), this.scene);
    }

    createSunLight() {
        this.sunLight = new BABYLON.DirectionalLight("stadiumSun", new BABYLON.Vector3(-1, -2, -1), this.scene);
        this.sunLight.position = new BABYLON.Vector3(20, 40, 20);
    }

    createShadows() {
        this.shadowGenerator = new BABYLON.ShadowGenerator(1024, this.sunLight);
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.blurKernel = 32;
        return this.shadowGenerator;
    }

    createNightFloodlights() {
        const towerData = [
            { pos: new BABYLON.Vector3(-80, 60, -60), target: new BABYLON.Vector3(-20, 0, -20) },            
        ];

        towerData.forEach((tower, index) => {
            const direction = tower.target.subtract(tower.pos).normalize();

            const light = new BABYLON.SpotLight(
                `stadiumFloodlight_${index}`,
                tower.pos, direction,
                Math.PI / 1.5, 10, this.scene
            );

            light.intensity = 0;
            

            if (this.shadowGenerator && index < 4) {
                this.shadowGenerator.addShadowCaster(light);
            }

            this.floodlights.push(light);
        });
    }

    applyTheme(isDayMode) {
        if (isDayMode) {
            // NORMAL DAY
            this.sunLight.intensity = 0.8;
            this.ambientLight.intensity = 0.6;
            this.ambientLight.groundColor = new BABYLON.Color3(0.1, 0.2, 0.1); // Normal dark bounce
            this.floodlights.forEach(light => light.intensity = 0);
        } else {
            // SUPER BRIGHT NIGHT MODE
            this.sunLight.intensity = 0.0;

            // 1. MASSIVE BOOST TO GLOBAL AMBIENT: This forces every seat and wall to light up!
            this.ambientLight.intensity = 1.0;

            // 2. BRIGHT GROUND COLOR: This forces the stadium roof and undersides to glow bright bluish-white!
            this.ambientLight.groundColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        }
    }
}