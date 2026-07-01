/**
 * Environment Stadium Module
 * Responsibilities: Loads the 3D stadium GLB model and sets up the root transformations.
 * Aesthetic Theme: White, Grey, Blue, Orange, Black (no yellow).
 */
export default class EnvironmentStadium {
    constructor(scene) {
        this.scene = scene;
        this.stadiumRoot = null;
    }

    setup(onProgress = null) {
        return new Promise((resolve, reject) => {
            BABYLON.SceneLoader.ImportMesh(
                "",
                "./assets/",
                "stadium.glb",
                this.scene,
                (meshes) => {
                    try {
                        const stadiumRoot = new BABYLON.TransformNode("stadiumRoot", this.scene);
                        this.stadiumRoot = stadiumRoot;

                        const setColor = (mat, color) => {
                            if (!mat) return;
                            if (mat.albedoColor !== undefined) mat.albedoColor = color;
                            if (mat.diffuseColor !== undefined) mat.diffuseColor = color;
                        };

                        const applyCrowdTexture = (mat, uScale = 24.0) => {
                            const crowdTex = new BABYLON.Texture("./assets/stadium_crowd.png?v=65", this.scene);
                            crowdTex.hasAlpha = true;
                            crowdTex.uScale = uScale;
                            crowdTex.vScale = 1.0;

                            if (mat.albedoTexture !== undefined) {
                                mat.albedoTexture = crowdTex;
                                mat.useAlphaFromAlbedoTexture = true;
                                mat.albedoColor = new BABYLON.Color3(1, 1, 1); // Native brightness
                                if (mat.transparencyMode !== undefined) {
                                    mat.transparencyMode = 1; // MATERIAL_ALPHATEST (prevents sorting issues, supports shadows)
                                }
                            } else {
                                mat.diffuseTexture = crowdTex;
                                mat.useAlphaFromDiffusiveTexture = true;
                                mat.diffuseColor = new BABYLON.Color3(1, 1, 1);
                            }

                            if (mat.metallic !== undefined) mat.metallic = 0.1;
                            if (mat.roughness !== undefined) mat.roughness = 0.8;
                            mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
                            mat.backFaceCulling = false; // Double-sided
                        };

                        meshes.forEach((mesh) => {
                            // Only parent top-level meshes (those without a parent) to the root
                            if (!mesh.parent) {
                                mesh.setParent(stadiumRoot);
                            }
                            mesh.receiveShadows = true;

                            // Generate Cylindrical UV coordinates if missing on the seating meshes
                            let usesSeatingMaterial = false;
                            if (mesh.material) {
                                const subMats = mesh.material.subMaterials ? mesh.material.subMaterials : [mesh.material];
                                subMats.forEach((mat) => {
                                    if (mat) {
                                        const matName = mat.name.toLowerCase();
                                        if (matName.includes("stand text")) {
                                            usesSeatingMaterial = true;
                                        }
                                    }
                                });
                            }

                            if (usesSeatingMaterial && mesh.isVerticesDataPresent && !mesh.isVerticesDataPresent(BABYLON.VertexBuffer.UVKind)) {
                                const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                                if (positions) {
                                    const uvs = [];
                                    let yMin = Infinity;
                                    let yMax = -Infinity;
                                    for (let i = 1; i < positions.length; i += 3) {
                                        const y = positions[i];
                                        if (y < yMin) yMin = y;
                                        if (y > yMax) yMax = y;
                                    }
                                    const yRange = (yMax - yMin) || 1.0;

                                    for (let i = 0; i < positions.length; i += 3) {
                                        const x = positions[i];
                                        const y = positions[i+1];
                                        const z = positions[i+2];

                                        // Cylindrical projection around local origin (0,0)
                                        const angle = Math.atan2(z, x);
                                        const u = (angle + Math.PI) / (2 * Math.PI);
                                        const v = (y - yMin) / yRange;
                                        uvs.push(u, v);
                                    }
                                    mesh.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs);
                                    console.log(`[Cylindrical UVs] Generated for mesh: ${mesh.name} (${positions.length / 3} vertices).`);
                                }
                            }

                            // Color customization for grey/white/untextured meshes
                            if (!mesh.material) {
                                const defaultMat = new BABYLON.StandardMaterial("defaultMat_" + mesh.name, this.scene);
                                if (mesh.name === "Plane" || mesh.name === "Plane.001" || (mesh.parent && mesh.parent.name === "Plane")) {
                                    // Outer base plate - concrete grey
                                    defaultMat.diffuseColor = new BABYLON.Color3(0.4, 0.42, 0.45);
                                    defaultMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                                } else {
                                    defaultMat.diffuseColor = new BABYLON.Color3(0.95, 0.95, 0.95); // clean white
                                }
                                mesh.material = defaultMat;
                            } else {
                                const materials = mesh.material.subMaterials ? mesh.material.subMaterials : [mesh.material];
                                materials.forEach((mat) => {
                                    if (!mat) return;
                                    const matName = mat.name.toLowerCase();
                                    
                                    if (mesh.name === "Plane" || mesh.name === "Plane.001" || (mesh.parent && mesh.parent.name === "Plane")) {
                                        // Outer base plate - concrete grey
                                        setColor(mat, new BABYLON.Color3(0.4, 0.42, 0.45));
                                    } else if (mesh.name === "Crease") {
                                        // Crease lines - crisp white
                                        setColor(mat, new BABYLON.Color3(0.95, 0.95, 0.95));
                                    } else if (mesh.name === "Boundry") {
                                        // Boundary wall - charcoal grey
                                        setColor(mat, new BABYLON.Color3(0.3, 0.32, 0.35));
                                    } else if (matName.includes("material.013") || matName.includes("material.008") || matName.includes("material.010") || matName.includes("material.012") || matName.includes("material.014")) {
                                        // Structural pillars, outer structures, and roof rims - clean white
                                        setColor(mat, new BABYLON.Color3(0.95, 0.95, 0.95));
                                    } else if (matName.includes("stand text")) {
                                        // Seating tiers (stands) - apply transparent crowd texture
                                        applyCrowdTexture(mat, 24.0);
                                    } else if (matName.includes("material.009")) {
                                        // Outline/circle - bright blue accent
                                        setColor(mat, new BABYLON.Color3(0.1, 0.5, 0.9));
                                    } else if (matName.includes("steps")) {
                                        // Stairs/steps - steel grey
                                        setColor(mat, new BABYLON.Color3(0.55, 0.58, 0.62));
                                    } else if (matName.includes("sidescreen") || matName.includes("outerbulb")) {
                                        // Screen panels - black
                                        setColor(mat, new BABYLON.Color3(0.08, 0.08, 0.08));
                                    } else if (matName.includes("stepbar") || matName.includes("material.006") || matName.includes("material.007")) {
                                        // Metal supports/bars - black
                                        setColor(mat, new BABYLON.Color3(0.08, 0.08, 0.08));
                                    } else if (matName.includes("material.011")) {
                                        // Background stands divide walls - matte black
                                        setColor(mat, new BABYLON.Color3(0.08, 0.08, 0.08));
                                    }
                                });
                            }
                        });

                        // Default positioning and scaling (can be modified if the model's dimensions require it)
                        stadiumRoot.position = new BABYLON.Vector3(0, 0, -1.86);
                        stadiumRoot.scaling = new BABYLON.Vector3(0.503, 0.503, 0.503);

                        console.log("Successfully loaded new stadium.glb and textured the seats.");

                        // Diagnostic UI Overlay
                        try {
                            const diagDiv = document.createElement("div");
                            diagDiv.id = "stadiumDiagDiv";
                            diagDiv.style.position = "absolute";
                            diagDiv.style.top = "120px";
                            diagDiv.style.left = "20px";
                            diagDiv.style.padding = "12px";
                            diagDiv.style.backgroundColor = "rgba(5, 15, 35, 0.95)";
                            diagDiv.style.color = "#00ffcc";
                            diagDiv.style.fontFamily = "monospace";
                            diagDiv.style.fontSize = "12px";
                            diagDiv.style.zIndex = "10005";
                            diagDiv.style.borderRadius = "6px";
                            diagDiv.style.border = "2px solid #00ffcc";
                            diagDiv.style.width = "450px";
                            diagDiv.innerHTML = "<b>🏟️ TARGET MATERIAL DIAGNOSTICS:</b><br>";
                            
                            this.scene.materials.forEach(mat => {
                                const name = mat.name;
                                const lowerName = name.toLowerCase();
                                if (lowerName.includes("stand text")) {
                                    const className = mat.getClassName ? mat.getClassName() : "Unknown";
                                    const hasAlbedo = mat.albedoTexture ? "YES" : "NO";
                                    const hasDiffuse = mat.diffuseTexture ? "YES" : "NO";
                                    let colInfo = "N/A";
                                    if (mat.albedoColor) colInfo = `albedo=${mat.albedoColor.toHexString()}`;
                                    else if (mat.diffuseColor) colInfo = `diffuse=${mat.diffuseColor.toHexString()}`;
                                    diagDiv.innerHTML += `• <b>${name}</b> (${className}):<br>` +
                                                         `  - albedoTex: ${hasAlbedo}, diffuseTex: ${hasDiffuse}<br>` +
                                                         `  - Color: ${colInfo}<br>`;
                                }
                            });
                            document.body.appendChild(diagDiv);
                        } catch (diagErr) {
                            console.error("Failed to build diagnostic overlay:", diagErr);
                        }

                        resolve();
                    } catch (err) {
                        console.error("Error setting up loaded stadium meshes:", err);
                        reject(err);
                    }
                },
                (evt) => {
                    if (onProgress) {
                        onProgress(evt);
                    }
                },
                (scene, message, exception) => {
                    console.error("Failed to load stadium GLB mesh:", message, exception);
                    reject(new Error(message));
                }
            );
        });
    }

    playIdleAnimation() {
        // Stub implementation in case standard animations are triggered by script.js
    }
}
