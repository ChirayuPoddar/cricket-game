/**
 * Environment Stadium Module (Final Force-Override Version)
 * Responsibilities: Strips all legacy materials from the .obj model and 
 * forces a clean Royal Blue and Stark White color scheme.
 */
export default class EnvironmentStadium {
    constructor(scene) {
        this.scene = scene;
    }

    setup(onProgress = null) {
        this.createBoundaryRope();
        return new Promise((resolve, reject) => {
            this.load3DStadiumModel(resolve, onProgress, reject);
        });
    }

    createBoundaryRope() {
        const boundaryPoints = [];
        const totalSegments = 128; // More segments = smoother circle
        const radius = 60; // Distance from center to boundary rope

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

    load3DStadiumModel(onComplete = null, onProgress = null, onError = null) {
        try {
            BABYLON.SceneLoader.ImportMesh(
                "",
                "./assets/",
                "stadium.obj",
                this.scene,
                (meshes) => {
                    try {
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
                            if (mesh.name && !mesh.name.toLowerCase().includes("field") && !mesh.name.toLowerCase().includes("pitch")) {

                                // Logic: Are these seats? 
                                // Based on your MTL file, anything with "blue", "seat", or "orange" is seating
                                const matName = (mesh.material && mesh.material.name) ? mesh.material.name.toLowerCase() : "";
                                if (matName.includes("blue") || matName.includes("seat") || matName.includes("orange")) {
                                    mesh.material = blueMat;
                                } else {
                                    // All structural parts
                                    mesh.material = whiteMat;
                                }
                            }
                        });

                        stadiumRoot.scaling = new BABYLON.Vector3(2.7, 2.7, 2.7);
                        stadiumRoot.position = new BABYLON.Vector3(18.0, -0.1, 0);

                        if (onComplete) onComplete();
                    } catch (err) {
                        console.error("Error in stadium onSuccess callback:", err);
                        if (onError) onError(err);
                    }
                },
                (evt) => {
                    if (onProgress) onProgress(evt);
                },
                (scene, message, exception) => {
                    console.error("Failed to load stadium mesh:", message, exception);
                    if (onError) onError(new Error(message));
                }
            );
        } catch (err) {
            console.error("Sync error starting stadium load:", err);
            if (onError) onError(err);
        }
    }
}
