/**
 * Environment Stadium Module (Final Force-Override Version)
 * Responsibilities: Strips all legacy materials from the .obj model and 
 * forces a clean Royal Blue and Stark White color scheme.
 */
export default class EnvironmentStadium {
    constructor(scene) {
        this.scene = scene;
    }

    setup() {
        this.createBoundaryRope();
        this.load3DStadiumModel();
    }

    createBoundaryRope() {
        const boundaryPoints = [];
        const totalSegments = 128; // More segments = smoother circle
        const radius = 40; // Distance from center to boundary rope

        for (let i = 0; i <= totalSegments; i++) {
            const angle = (i / totalSegments) * Math.PI * 2;
            boundaryPoints.push(new BABYLON.Vector3(Math.cos(angle) * radius, 0.05, Math.sin(angle) * radius));
        }

        const boundaryRope = BABYLON.MeshBuilder.CreateTube("boundaryRope", {
            path: boundaryPoints,
            radius: 0.15,
            tessellation: 8
        }, this.scene);

        const ropeMaterial = new BABYLON.StandardMaterial("ropeMat", this.scene);
        ropeMaterial.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.95);
        boundaryRope.material = ropeMaterial;
    }

    load3DStadiumModel() {
        BABYLON.SceneLoader.ImportMesh(
            "",
            "./assets/",
            "stadium.obj",
            this.scene,
            (meshes) => {
                const stadiumRoot = new BABYLON.TransformNode("stadiumRoot", this.scene);

                // 1. Define materials
                const blueMat = new BABYLON.StandardMaterial("blueMat", this.scene);
                blueMat.diffuseColor = new BABYLON.Color3(0.05, 0.22, 0.65); // Deep Royal Blue

                const whiteMat = new BABYLON.StandardMaterial("whiteMat", this.scene);
                whiteMat.diffuseColor = new BABYLON.Color3(0.98, 0.98, 0.98); // Stark White

                // 2. Loop through every mesh and FORCE the material
                meshes.forEach((mesh) => {
                    mesh.setParent(stadiumRoot);

                    // If the mesh is NOT the playing field (keep that green!), color it
                    if (!mesh.name.toLowerCase().includes("field") && !mesh.name.toLowerCase().includes("pitch")) {

                        // Logic: Are these seats? 
                        // Based on your MTL file, anything with "blue", "seat", or "orange" is seating
                        if (mesh.material && (
                            mesh.material.name.toLowerCase().includes("blue") ||
                            mesh.material.name.toLowerCase().includes("seat") ||
                            mesh.material.name.toLowerCase().includes("orange")
                        )) {
                            mesh.material = blueMat;
                        } else {
                            // All structural parts
                            mesh.material = whiteMat;
                        }
                    }
                });

                stadiumRoot.scaling = new BABYLON.Vector3(1.8, 1.8, 1.8);
                stadiumRoot.position = new BABYLON.Vector3(12, -0.1, 0);
            }
        );
    }
}
