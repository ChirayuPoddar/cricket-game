// DAY 1 QUICK WINS: New Architecture Modules
import ConfigManager from './core/ConfigManager.js?v=54';
import EventBus from './core/EventBus.js';
import PerformanceMonitor from './ui/PerformanceMonitor.js?v=54';
import ShotClassifier from './gameplay/ShotClassifier.js?v=54';

// 1. Import Core Engine Architecture Modules
import { GameEngine } from './core/engine.js?v=54';
import { GameScene } from './core/scene.js?v=54';

// 2. Import All Environment/Scenery Modules
import EnvironmentCamera from './environment/camera.js?v=54';
import EnvironmentLights from './environment/lights.js?v=54';
import EnvironmentSky from './environment/sky.js?v=54';
import EnvironmentGround from './environment/ground.js?v=54';
import EnvironmentWickets from './environment/wickets.js?v=54';
import EnvironmentHand from './environment/hand.js?v=58';
import EnvironmentBall from './environment/ball.js?v=58';
import EnvironmentStadium from './environment/stadium.js?v=65';
import EnvironmentPlayers from './environment/players.js?v=54';

// Upgraded Scoreboard UI Import
import GameUI from './ui/scoreboard.js?v=54';

// Import newly created UI Modules
import LiveFieldRadar from './ui/radar.js?v=54';
import PauseMenu from './ui/pauseMenu.js?v=54';

window.isDayMode = true;

async function initGame() {
    try {
        // STEP 1: Load configuration FIRST (before anything else)
        await ConfigManager.load();

        // STEP 2: Initialize performance monitoring
        const perfMonitor = new PerformanceMonitor();
        perfMonitor.initialize();
        perfMonitor.start();
        window.perfMonitor = perfMonitor; // Make globally accessible for debugging

        // STEP 3: Make EventBus globally accessible for debugging
        window.EventBus = EventBus;
        window.ConfigManager = ConfigManager;

        // STEP 4: Initialize shot classifier
        const shotClassifier = new ShotClassifier(ConfigManager.getAll());
        window.shotClassifier = shotClassifier;

        const gameEngineModule = new GameEngine("renderCanvas");
        const engine = gameEngineModule.initialize();

        const gameSceneModule = new GameScene(engine);
        const scene = gameSceneModule.create();

        // Hardware glow effect for night floodlight radiancebloom (optimized)
        const gl = new BABYLON.GlowLayer("glow", scene, {
            mainTextureRatio: 0.25, // Quarter-res texture for glow blur (massive speed boost!)
            blurKernelSize: 16       // Smaller blur kernel size for better performance
        });
        gl.intensity = 0.6;
        gl.isEnabled = !window.isDayMode;

        const cameraModule = new EnvironmentCamera(scene, gameEngineModule.canvas);
        cameraModule.setup();

        const lightsModule = new EnvironmentLights(scene);
        const lightingAssets = lightsModule.setup();

        const skyModule = new EnvironmentSky(scene);
        skyModule.setup();

        // Apply initial theme settings immediately on load to prevent rendering inconsistencies
        lightsModule.applyTheme(window.isDayMode);
        skyModule.applyTheme(window.isDayMode);

        const groundModule = new EnvironmentGround(scene);
        groundModule.setup();

        // Initialize and mount the Stadium Scenery
        const stadiumModule = new EnvironmentStadium(scene);

        const handleProgress = (evt) => {
            const statusEl = document.getElementById("loadingStatus");
            const progressEl = document.getElementById("progressBar");
            const totalBytes = (evt.total > 0) ? evt.total : 56518894; // 56.5MB stadium.obj size fallback
            const percent = Math.min(100, Math.round((evt.loaded / totalBytes) * 100));

            if (statusEl) {
                statusEl.innerText = `Loading stadium: ${percent}%`;
            }
            if (progressEl) {
                progressEl.style.width = `${percent}%`;
            }
        };

        const stadiumPromise = stadiumModule.setup(handleProgress);

        // Initialize and mount the Upgraded Scoreboard Dashboard
        const uiModule = new GameUI();
        uiModule.setup();

        const wicketsModule = new EnvironmentWickets(scene, lightingAssets.shadowGenerator);
        wicketsModule.setup();

        const handModule = new EnvironmentHand(scene);
        const handGroup = handModule.setup();

        if (cameraModule.setHandGroup) {
            cameraModule.setHandGroup(handGroup);
        }

        const ballModule = new EnvironmentBall(scene, lightingAssets.shadowGenerator);
        ballModule.setup(handGroup, wicketsModule, uiModule, cameraModule);

        // Initialize and mount the players (fielders, bowler, wicketkeeper)
        const playersModule = new EnvironmentPlayers(scene, lightingAssets.shadowGenerator);
        const playersPromise = playersModule.setup(ballModule);

        // Initialize Live Field Radar UI Module
        const radarUI = new LiveFieldRadar("radarCanvas");

        // Initialize Pause Menu UI Module
        const pauseMenu = new PauseMenu("pauseModal", uiModule, ballModule, lightsModule, skyModule, gl);

        // Create Free Camera Button
        const freeCamBtn = document.createElement("button");
        freeCamBtn.id = "freeCamBtn";
        freeCamBtn.innerText = "🎥 Free Cam";
        freeCamBtn.style.position = "absolute";
        freeCamBtn.style.top = "20px";
        freeCamBtn.style.right = "80px"; // Placed to the left of the Pause button (which is at right: 20px)
        freeCamBtn.style.padding = "10px 14px";
        freeCamBtn.style.backgroundColor = "#051641";
        freeCamBtn.style.color = "#ffffff";
        freeCamBtn.style.border = "2px solid #00ffff"; // cyan accent
        freeCamBtn.style.borderRadius = "6px";
        freeCamBtn.style.cursor = "pointer";
        freeCamBtn.style.fontSize = "16px";
        freeCamBtn.style.fontWeight = "bold";
        freeCamBtn.style.zIndex = "1000";
        freeCamBtn.style.transition = "all 0.2s ease";

        freeCamBtn.onmouseenter = () => {
            freeCamBtn.style.transform = "scale(1.05)";
            freeCamBtn.style.backgroundColor = "#0a2266";
            freeCamBtn.style.boxShadow = "0 0 10px rgba(0, 255, 255, 0.4)";
        };
        freeCamBtn.onmouseleave = () => {
            freeCamBtn.style.transform = "scale(1.0)";
            freeCamBtn.style.backgroundColor = "#051641";
            freeCamBtn.style.boxShadow = "none";
        };

        // Create help banner overlay for controls
        const helpBanner = document.createElement("div");
        helpBanner.id = "freeCamHelpBanner";
        helpBanner.innerHTML = "<strong>Free Cam:</strong> WASD / Arrows = Fly | Mouse = Look | Press '🎮 Game Cam' to exit";
        helpBanner.style.position = "absolute";
        helpBanner.style.bottom = "80px";
        helpBanner.style.left = "50%";
        helpBanner.style.transform = "translateX(-50%)";
        helpBanner.style.padding = "10px 20px";
        helpBanner.style.backgroundColor = "rgba(5, 22, 65, 0.85)";
        helpBanner.style.color = "#ffffff";
        helpBanner.style.border = "2px solid #00ffff";
        helpBanner.style.borderRadius = "20px";
        helpBanner.style.fontSize = "14px";
        helpBanner.style.fontFamily = "sans-serif";
        helpBanner.style.zIndex = "1000";
        helpBanner.style.pointerEvents = "none";
        helpBanner.style.display = "none";
        helpBanner.style.boxShadow = "0 4px 15px rgba(0, 255, 255, 0.3)";
        document.body.appendChild(helpBanner);
        document.body.appendChild(freeCamBtn);

        window.freeRoamActive = false;

        freeCamBtn.onclick = () => {
            window.freeRoamActive = !window.freeRoamActive;

            // Blur the button so it doesn't intercept keyboard inputs
            freeCamBtn.blur();

            // Focus canvas to ensure keyboard inputs are registered immediately
            const canvas = document.getElementById("renderCanvas");
            if (canvas) {
                canvas.tabIndex = 1; // ensure focusable
                canvas.focus();
            }

            if (window.freeRoamActive) {
                freeCamBtn.innerText = "🎮 Game Cam";
                freeCamBtn.style.border = "2px solid #ff00ff"; // magenta accent when active
                helpBanner.style.display = "block";

                // Pause gameplay and animations
                window.gamePaused = true;
                scene.animationsEnabled = false;

                // Enable free roam
                cameraModule.enableFreeRoam(true);

                if (uiModule) {
                    uiModule.showAnnouncement("FREE CAMERA MODE", "#00ffff");
                }
            } else {
                freeCamBtn.innerText = "🎥 Free Cam";
                freeCamBtn.style.border = "2px solid #00ffff";
                helpBanner.style.display = "none";

                // Deselect selected model when exiting free roam
                if (window.deselectFan) {
                    window.deselectFan();
                }

                // Resume gameplay and animations
                window.gamePaused = false;
                scene.animationsEnabled = true;

                // Disable free roam
                cameraModule.enableFreeRoam(false);

                if (uiModule) {
                    uiModule.showAnnouncement("GAME RESUMED", "#00ff00");
                }
            }
        };

        // Create beautiful floating selection editor panel
        const panel = document.createElement("div");
        panel.id = "fanEditorPanel";
        panel.style.position = "absolute";
        panel.style.bottom = "140px";
        panel.style.left = "50%";
        panel.style.transform = "translateX(-50%)";
        panel.style.padding = "15px 25px";
        panel.style.backgroundColor = "rgba(5, 22, 65, 0.95)";
        panel.style.color = "#ffffff";
        panel.style.border = "2px solid #ff00ff";
        panel.style.borderRadius = "10px";
        panel.style.zIndex = "1001";
        panel.style.display = "none";
        panel.style.flexDirection = "column";
        panel.style.alignItems = "center";
        panel.style.gap = "10px";
        panel.style.boxShadow = "0 10px 30px rgba(255, 0, 255, 0.4)";
        panel.style.fontFamily = "sans-serif";
        panel.style.minWidth = "220px";
        
        panel.innerHTML = `
            <div style="font-weight:bold; font-size:16px; color:#ff00ff; margin-bottom:2px; text-shadow:0 0 5px rgba(255,0,255,0.5);">👤 Fan Selected</div>
            <div style="font-size:11px; opacity:0.8; margin-bottom:8px; text-align:center;">Drag & Drop with Mouse | Move: Arrows (H) | PageUp/Dn (V)<br>Delete: Backspace / Delete</div>
            <div style="display:flex; gap:8px;">
                <button id="editorMoveLeft" title="Move Left (-X)">◀ Left</button>
                <button id="editorMoveForward" title="Move Forward (+Z)">▲ Fwd</button>
                <button id="editorMoveBackward" title="Move Backward (-Z)">▼ Back</button>
                <button id="editorMoveRight" title="Move Right (+X)">▶ Right</button>
            </div>
            <div style="display:flex; gap:8px; align-items:center; margin-top:2px;">
                <button id="editorMoveUp" title="Move Up (+Y)" style="border-color:#00ffff;">▲ Up</button>
                <button id="editorMoveDown" title="Move Down (-Y)" style="border-color:#00ffff;">▼ Down</button>
                <button id="editorDelete" style="background-color:#ff3333; border-color:#ff3333;">🗑 Delete</button>
                <button id="editorResetCrowd" style="background-color:#555555; border-color:#555555;">🔄 Reset All</button>
            </div>
        `;
        document.body.appendChild(panel);

        const btnIds = ["editorMoveLeft", "editorMoveForward", "editorMoveBackward", "editorMoveRight", "editorMoveUp", "editorMoveDown", "editorDelete", "editorResetCrowd"];
        btnIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.style.padding = "6px 14px";
                btn.style.backgroundColor = id === "editorDelete" ? "#ff3333" : (id === "editorResetCrowd" ? "#555555" : "#0f2b7a");
                btn.style.color = "#ffffff";
                btn.style.border = id === "editorDelete" ? "1px solid #ff3333" : (id === "editorResetCrowd" ? "1px solid #555555" : "1px solid #ff00ff");
                btn.style.borderRadius = "4px";
                btn.style.cursor = "pointer";
                btn.style.fontWeight = "bold";
                btn.style.fontSize = "12px";
                btn.style.transition = "all 0.1s ease";
                
                btn.onmouseenter = () => {
                    btn.style.transform = "scale(1.08)";
                    btn.style.backgroundColor = id === "editorDelete" ? "#cc2424" : (id === "editorResetCrowd" ? "#777777" : "#163fa8");
                };
                btn.onmouseleave = () => {
                    btn.style.transform = "scale(1.0)";
                    btn.style.backgroundColor = id === "editorDelete" ? "#ff3333" : (id === "editorResetCrowd" ? "#555555" : "#0f2b7a");
                };
            }
        });

        // Setup persistent fan edits saving function
        window.saveFanEdit = (id, status, position = null) => {
            let edits = {};
            try {
                const saved = localStorage.getItem("stadium_fan_edits");
                if (saved) edits = JSON.parse(saved);
            } catch(e) {
                console.error("Failed to parse fan edits:", e);
            }
            
            if (status === "deleted") {
                edits[id] = { status: "deleted" };
            } else if (status === "moved" && position) {
                edits[id] = {
                    status: "moved",
                    position: { x: position.x, y: position.y, z: position.z }
                };
            }
            
            localStorage.setItem("stadium_fan_edits", JSON.stringify(edits));
        };

        // Initialize PointerDragBehavior (constrained to horizontal X-Z plane)
        window.dragBehavior = new BABYLON.PointerDragBehavior({ dragPlaneNormal: new BABYLON.Vector3(0, 1, 0) });
        window.dragBehavior.moveAttached = false; // Manually move dummyRoot instead of individual sub-mesh

        window.dragBehavior.onDragObservable.add((event) => {
            if (window.selectedFan) {
                window.selectedFan.position.addInPlace(event.delta);
            }
        });

        window.dragBehavior.onDragEndObservable.add(() => {
            if (window.selectedFan) {
                const id = window.selectedFan.name;
                window.saveFanEdit(id, "moved", window.selectedFan.position);
            }
        });

        const moveSelectedFan = (dx, dy, dz) => {
            if (window.selectedFan) {
                window.selectedFan.position.x += dx;
                window.selectedFan.position.y += dy;
                window.selectedFan.position.z += dz;
                
                const id = window.selectedFan.name;
                window.saveFanEdit(id, "moved", window.selectedFan.position);
            }
        };

        const deleteSelectedFan = () => {
            if (window.selectedFan) {
                const id = window.selectedFan.name;
                window.saveFanEdit(id, "deleted");
                
                window.selectedFan.dispose();
                window.deselectFan();
            }
        };

        window.selectFan = (mesh) => {
            window.deselectFan();
            const dummyRoot = mesh.parent;
            if (!dummyRoot) return;
            
            window.selectedFan = dummyRoot;
            dummyRoot.getChildMeshes().forEach(m => {
                m.showBoundingBox = true;
            });
            
            // Attach drag behavior to the clicked mesh instance
            mesh.addBehavior(window.dragBehavior);
            
            const p = document.getElementById("fanEditorPanel");
            if (p) p.style.display = "flex";
        };

        window.deselectFan = () => {
            if (window.selectedFan) {
                try {
                    window.selectedFan.getChildMeshes().forEach(m => {
                        m.showBoundingBox = false;
                        // Remove drag behavior
                        m.removeBehavior(window.dragBehavior);
                    });
                } catch(e) {}
                window.selectedFan = null;
            }
            const p = document.getElementById("fanEditorPanel");
            if (p) p.style.display = "none";
        };

        // Pointerdown pick hook (Select model when clicked in Free Cam mode)
        scene.onPointerDown = (evt, pickResult) => {
            if (!window.freeRoamActive) return;
            
            if (pickResult.hit && pickResult.pickedMesh) {
                const mesh = pickResult.pickedMesh;
                if (mesh.name && mesh.name.startsWith("fan_inst_")) {
                    window.selectFan(mesh);
                } else {
                    window.deselectFan();
                }
            } else {
                window.deselectFan();
            }
        };

        // Keyboard navigation and editing for the selected fan model
        window.addEventListener("keydown", (e) => {
            if (!window.freeRoamActive || !window.selectedFan) return;
            
            const step = 0.25;
            if (e.key === "ArrowUp") {
                moveSelectedFan(0, 0, step);
                e.preventDefault();
            } else if (e.key === "ArrowDown") {
                moveSelectedFan(0, 0, -step);
                e.preventDefault();
            } else if (e.key === "ArrowLeft") {
                moveSelectedFan(-step, 0, 0);
                e.preventDefault();
            } else if (e.key === "ArrowRight") {
                moveSelectedFan(step, 0, 0);
                e.preventDefault();
            } else if (e.key === "PageUp") {
                moveSelectedFan(0, step, 0);
                e.preventDefault();
            } else if (e.key === "PageDown") {
                moveSelectedFan(0, -step, 0);
                e.preventDefault();
            } else if (e.key === "Delete" || e.key === "Backspace") {
                deleteSelectedFan();
                e.preventDefault();
            }
        });

        // Click handlers for editor UI buttons
        document.getElementById("editorMoveLeft").onclick = () => moveSelectedFan(-0.25, 0, 0);
        document.getElementById("editorMoveRight").onclick = () => moveSelectedFan(0.25, 0, 0);
        document.getElementById("editorMoveUp").onclick = () => moveSelectedFan(0, 0.25, 0);
        document.getElementById("editorMoveDown").onclick = () => moveSelectedFan(0, -0.25, 0);
        document.getElementById("editorMoveForward").onclick = () => moveSelectedFan(0, 0, 0.25);
        document.getElementById("editorMoveBackward").onclick = () => moveSelectedFan(0, 0, -0.25);
        document.getElementById("editorDelete").onclick = () => deleteSelectedFan();
        
        document.getElementById("editorResetCrowd").onclick = () => {
            if (confirm("Are you sure you want to reset all custom fan placements and restore the default crowd?")) {
                localStorage.removeItem("stadium_fan_edits");
                location.reload();
            }
        };

        // Register update hook for the Live Field Radar and pause animation sync
        scene.onBeforeRenderObservable.add(() => {
            scene.animationsEnabled = !window.gamePaused;
            radarUI.update(playersModule, ballModule);
        });

        gameEngineModule.startRenderLoop(scene, perfMonitor);

        window.gamePaused = true;

        const showPlayButton = () => {
            const statusEl = document.getElementById("loadingStatus");
            const spinnerEl = document.getElementById("loadingSpinner");
            const progressContainerEl = document.getElementById("progressContainer");
            const startBtn = document.getElementById("startGameBtn");

            if (spinnerEl) spinnerEl.style.display = "none";
            if (progressContainerEl) progressContainerEl.style.display = "none";
            if (statusEl) {
                statusEl.innerText = "Ready to play!";
                statusEl.style.color = "#00ff00";
            }
            if (startBtn) {
                startBtn.innerText = "Play Game 🏏"; // Start button renamed to Play button
                startBtn.style.display = "block";
                startBtn.onclick = () => {
                    const overlay = document.getElementById("loadingOverlay");
                    if (overlay) {
                        overlay.style.opacity = "0";
                        setTimeout(() => {
                            overlay.style.display = "none";
                        }, 500);
                    }
                    // Start/Resume the game!
                    window.gamePaused = false;
                    if (uiModule) {
                        uiModule.showAnnouncement("LET'S PLAY! 🏏", "#00FF00");
                    }
                };

                startBtn.onmouseenter = () => {
                    startBtn.style.transform = "scale(1.05)";
                    startBtn.style.boxShadow = "0 6px 25px rgba(0, 255, 0, 0.6)";
                };
                startBtn.onmouseleave = () => {
                    startBtn.style.transform = "scale(1.0)";
                    startBtn.style.boxShadow = "0 4px 20px rgba(0, 255, 0, 0.4)";
                };
            }
        };

        // Wait for 3D stadium meshes and players to compile and load fully
        Promise.all([stadiumPromise, playersPromise]).then(() => {
            if (stadiumModule && stadiumModule.playIdleAnimation) {
                stadiumModule.playIdleAnimation();
            }
            showPlayButton();
        }).catch((err) => {
            console.error("Failed to load stadium or players, starting fallback game:", err);
            const statusEl = document.getElementById("loadingStatus");
            if (statusEl) {
                statusEl.innerText = "Error loading assets. Starting game...";
                statusEl.style.color = "#ff3333";
            }
            setTimeout(() => {
                showPlayButton();
            }, 1500);
        });
    } catch (err) {
        console.error("Global game init failed:", err);
        const statusEl = document.getElementById("loadingStatus");
        if (statusEl) {
            statusEl.innerText = "Boot Error: " + err.message;
            statusEl.style.color = "#ff3333";
        }
        // Recovery fallback: hide spinner/progress bar, show Play button
        try {
            const startBtn = document.getElementById("startGameBtn");
            const spinnerEl = document.getElementById("loadingSpinner");
            const progressContainerEl = document.getElementById("progressContainer");
            if (spinnerEl) spinnerEl.style.display = "none";
            if (progressContainerEl) progressContainerEl.style.display = "none";
            if (startBtn) {
                startBtn.innerText = "Play Game 🏏";
                startBtn.style.display = "block";
                startBtn.onclick = () => {
                    const overlay = document.getElementById("loadingOverlay");
                    if (overlay) overlay.style.display = "none";
                    window.gamePaused = false;
                };
            }
        } catch (btnErr) {
            console.error("Failed to show recovery play button:", btnErr);
        }
    }
}

if (document.readyState === "complete" || document.readyState === "interactive") {
    initGame();
} else {
    window.addEventListener("DOMContentLoaded", initGame);
}
