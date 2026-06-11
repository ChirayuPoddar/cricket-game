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
        // Stumps are at z = 8.2. Pitch starts at z = -12.5.
        // Pitch length = 8.2 - (-12.5) = 20.7 meters.
        // Center of pitch is at z = (-12.5 + 8.2) / 2 = -2.15.
        this.pitchMesh = BABYLON.MeshBuilder.CreateGround("clayPitch", { width: 3, height: 20.7 }, this.scene);
        this.pitchMesh.position.y = 0.001; // Elevate slightly above grass to prevent texture flickering
        this.pitchMesh.position.z = -2.15; // Shift to end exactly at the stumps

        const pitchMaterial = new BABYLON.StandardMaterial("pitchMat", this.scene);
        pitchMaterial.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);

        // Create a high-quality dynamic texture for the pitch and paint crease lines
        const width = 512;
        const height = 1024;
        const dynamicTexture = new BABYLON.DynamicTexture("pitchTexture", { width, height }, this.scene, false);
        const ctx = dynamicTexture.getContext();

        // 1. Draw a realistic baked clay pitch background with minor color variations
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, "#dfcd9c");
        grad.addColorStop(0.3, "#e9d9a7");
        grad.addColorStop(0.7, "#e9d9a7");
        grad.addColorStop(1, "#dfcd9c");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Add subtle wear-and-tear patches on the clay pitch
        ctx.fillStyle = "rgba(215, 195, 150, 0.25)";
        for (let i = 0; i < 24; i++) {
            const px = Math.random() * width;
            const py = Math.random() * height;
            const pw = 30 + Math.random() * 60;
            const ph = 40 + Math.random() * 120;
            ctx.fillRect(px, py, pw, ph);
        }

        // 2. Draw standard white crease lines (approx 5px wide for visibility in 3D)
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 5;

        // BATTING END CREASES (Stumps are at z = 8.2, which maps to top of texture y = 0)
        // Bowling crease (aligned with stumps at z = 8.2)
        ctx.beginPath();
        ctx.moveTo(0, 5);
        ctx.lineTo(width, 5);
        ctx.stroke();

        // Popping crease (1.22m in front of stumps at z = 6.98, maps to y = 60)
        ctx.beginPath();
        ctx.moveTo(0, 60);
        ctx.lineTo(width, 60);
        ctx.stroke();

        // Return creases (1.32m from center, maps to x = 31 and x = 481, from popping crease to end of pitch)
        ctx.beginPath();
        ctx.moveTo(31, 60);
        ctx.lineTo(31, 0);
        ctx.moveTo(481, 60);
        ctx.lineTo(481, 0);
        ctx.stroke();

        // BOWLER'S END CREASES (Stumps position at z = -11.92 maps to bottom of texture y = 995)
        // Bowling crease (aligned with bowler's stumps at z = -11.92)
        ctx.beginPath();
        ctx.moveTo(0, 995);
        ctx.lineTo(width, 995);
        ctx.stroke();

        // Popping crease (1.22m in front of bowler's stumps at z = -10.7, maps to y = 935)
        ctx.beginPath();
        ctx.moveTo(0, 935);
        ctx.lineTo(width, 935);
        ctx.stroke();

        // Return creases (from popping crease to start of pitch)
        ctx.beginPath();
        ctx.moveTo(31, 935);
        ctx.lineTo(31, 1024);
        ctx.moveTo(481, 935);
        ctx.lineTo(481, 1024);
        ctx.stroke();

        dynamicTexture.update();

        pitchMaterial.diffuseTexture = dynamicTexture;
        pitchMaterial.diffuseColor = new BABYLON.Color3(1.0, 1.0, 1.0);

        this.pitchMesh.material = pitchMaterial;
        this.pitchMesh.receiveShadows = true;
    }
}