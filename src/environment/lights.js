export default class EnvironmentLights {
    constructor(scene) {
        this.scene = scene;
        this.ambientLight = null;
        this.sunLight = null;
        this.groundLight = null; // Dedicated light to illuminate the ground and players
        this.shadowGenerator = null;
        this.floodlights = [];
    }

    setup() {
        this.createAmbientLight();
        this.createSunLight();
        this.createGroundLight();
        this.createNightFloodlights();

        // Ensure Babylon processes enough lights for the field
        this.scene.materials.forEach(mat => {
            mat.maxSimultaneousLights = 8;
        });

        // Enable ACES Tone Mapping and Color Processing for high saturation, contrast, and brightness realism
        this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
        this.scene.imageProcessingConfiguration.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
        this.scene.imageProcessingConfiguration.contrast = 1.18;
        this.scene.imageProcessingConfiguration.exposure = 1.15;

        return {
            ambientLight: this.ambientLight,
            sunLight: this.sunLight,
            groundLight: this.groundLight,
            shadowGenerator: this.createShadows()
        };
    }

    createAmbientLight() {
        this.ambientLight = new BABYLON.HemisphericLight("stadiumAmbient", new BABYLON.Vector3(0, 1, 0), this.scene);
        this.ambientLight.diffuse = new BABYLON.Color3(0.75, 0.85, 1.0); // Rich sky-blue skylight
        this.ambientLight.groundColor = new BABYLON.Color3(0.18, 0.32, 0.14); // Saturated grass bounce green
        this.ambientLight.intensity = 0.55;
    }

    createSunLight() {
        this.sunLight = new BABYLON.DirectionalLight("stadiumSun", new BABYLON.Vector3(-1, -2, -1), this.scene);
        this.sunLight.position = new BABYLON.Vector3(20, 40, 20);
        this.sunLight.diffuse = new BABYLON.Color3(1.0, 0.96, 0.86); // Warm golden sun hue
        this.sunLight.specular = new BABYLON.Color3(1.0, 0.96, 0.86);
        this.sunLight.intensity = 1.1;
    }

    createGroundLight() {
        // Ground-level fill light to illuminate players' bodies and keep ground details bright
        this.groundLight = new BABYLON.HemisphericLight("stadiumGroundLight", new BABYLON.Vector3(0, 1, 0), this.scene);
        this.groundLight.diffuse = new BABYLON.Color3(1.0, 1.0, 0.96); // Warm neutral white
        this.groundLight.groundColor = new BABYLON.Color3(0.18, 0.28, 0.15); // Grass green bounce reflection
        this.groundLight.intensity = 0.3; // Low in daytime
    }

    createShadows() {
        this.shadowGenerator = new BABYLON.ShadowGenerator(1024, this.sunLight);
        this.shadowGenerator.useExponentialShadowMap = true; // High performance shadows
        return this.shadowGenerator;
    }

    createNightFloodlights() {
        // Place 4 powerful floodlight towers at the 4 corners of the stadium to light the pitch and seating evenly
        const towerData = [
            { pos: new BABYLON.Vector3(-60, 50, -60), target: new BABYLON.Vector3(-10, 0, -10) },
            { pos: new BABYLON.Vector3(60, 50, -60), target: new BABYLON.Vector3(10, 0, -10) },
            { pos: new BABYLON.Vector3(-60, 50, 60), target: new BABYLON.Vector3(-10, 0, 10) },
            { pos: new BABYLON.Vector3(60, 50, 60), target: new BABYLON.Vector3(10, 0, 10) }
        ];

        towerData.forEach((tower, index) => {
            const direction = tower.target.subtract(tower.pos).normalize();

            const light = new BABYLON.SpotLight(
                `stadiumFloodlight_${index}`,
                tower.pos, direction,
                Math.PI / 1.3, 1.5, this.scene
            );

            light.diffuse = new BABYLON.Color3(0.92, 0.95, 1.0); // Saturated crisp white floodlight cone
            light.specular = new BABYLON.Color3(0.92, 0.95, 1.0);
            light.range = 250; // Extend range to easily cover the ground from 50m height
            light.intensity = 0; // Off by default in Day mode
            
            this.floodlights.push(light);
        });
    }

    applyTheme(isDayMode) {
        if (isDayMode) {
            // DAY MODE: Bright, warm golden sunlit ambiance
            this.sunLight.intensity = 1.1;
            this.ambientLight.intensity = 0.55;
            this.ambientLight.diffuse = new BABYLON.Color3(0.75, 0.85, 1.0);
            this.ambientLight.groundColor = new BABYLON.Color3(0.18, 0.32, 0.14);
            
            this.groundLight.intensity = 0.3; // Soft supplementary daylight
            
            // Turn off floodlights
            this.floodlights.forEach(light => light.intensity = 0);
        } else {
            // TWILIGHT NIGHT MODE: Stadium floodlights activated, cool atmospheric ambient
            this.sunLight.intensity = 0.0;
            this.ambientLight.intensity = 0.65;
            this.ambientLight.diffuse = new BABYLON.Color3(0.25, 0.35, 0.55); // Rich twilight blue sky dome glow
            this.ambientLight.groundColor = new BABYLON.Color3(0.12, 0.16, 0.22); // Deep navy grass bounce
            
            // High-power ground fill light to make players stand out in detail on the turf
            this.groundLight.intensity = 0.95;
            
            // Activate floodlights
            this.floodlights.forEach(light => {
                light.intensity = 4.5; // High power stadium lighting
            });
        }
    }
}