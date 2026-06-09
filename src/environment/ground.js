/**
 * Environment Ground Module
 * Responsibilities: Creating the playing field plane and applying a sharp,
 * light-and-dark green checkerboard pattern across the turf.
 */
export default class EnvironmentGround {
    constructor(scene) {
        this.scene = scene;
        this.groundMesh = null;
        this.pitchMesh = null;
    }

    setup() {
        // Create a massive field ground plane
        this.groundMesh = BABYLON.MeshBuilder.CreateGround("playingField", {
            width: 120,
            height: 120
        }, this.scene);

        this.applyCheckerboardTurf();
        this.createPitch();
    }

    applyCheckerboardTurf() {
        const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", this.scene);

        // Create a 512x512 dynamic texture pattern for the checks
        const dynamicTexture = new BABYLON.DynamicTexture("turfTexture", 512, this.scene, false);
        const ctx = dynamicTexture.getContext();

        const gridCount = 20; // Number of checkered rows/columns
        const cellSize = 512 / gridCount;

        // Draw an alternating light-green and dark-green grid pattern onto the texture canvas
        for (let x = 0; x < gridCount; x++) {
            for (let y = 0; y < gridCount; y++) {
                if ((x + y) % 2 === 0) {
                    ctx.fillStyle = "#489438"; // Vibrant Light Green
                } else {
                    ctx.fillStyle = "#2e6b24"; // Rich Dark Green
                }
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }

        dynamicTexture.update(); // Push drawing details directly to GPU

        groundMaterial.diffuseTexture = dynamicTexture;
        groundMaterial.specularColor = new BABYLON.Color3(0.01, 0.01, 0.01); // Matte grass finish

        this.groundMesh.material = groundMaterial;

        // Optional: Ensure the pitch stays flat under shadows
        this.groundMesh.receiveShadows = true;
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