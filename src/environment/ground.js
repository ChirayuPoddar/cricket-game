/**
 * Environment Ground Module
 * Responsibilities: Sets up the visual boundary rope on the ground.
 */
export default class EnvironmentGround {
    constructor(scene) {
        this.scene = scene;
        this.boundaryRope = null;
    }

    setup() {
        // Create 3D boundary rope at boundary radius (36.5m)
        const boundaryRadius = 36.5;
        
        this.boundaryRope = BABYLON.MeshBuilder.CreateTorus("boundaryRope", {
            diameter: boundaryRadius * 2,
            thickness: 0.25, // 25cm thick rope
            tessellation: 128
        }, this.scene);
        
        this.boundaryRope.position = new BABYLON.Vector3(0, 0.125, -1.86); // centered at stadium center
        
        // Add a clean white material to the rope
        const ropeMat = new BABYLON.StandardMaterial("boundaryRopeMat", this.scene);
        ropeMat.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.95);
        ropeMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
        ropeMat.roughness = 0.5;
        this.boundaryRope.material = ropeMat;

        // Enable casting/receiving shadows
        this.boundaryRope.receiveShadows = true;
    }
}