import EventBus from '../core/EventBus.js';

export default class EnvironmentPlayers {
    constructor(scene, shadowGenerator) {
        this.scene = scene;
        this.shadowGenerator = shadowGenerator;
        
        this.ballModule = null;
        this.players = []; // Array of player objects: { name, type, root, anims: { idle, run }, startPos, startRotY }
        
        // Master assets container caches
        this.botContainer = null;
        this.idleContainer = null;
        this.runContainer = null;

        // Model orientation offset (Mixamo models usually face -Z, requiring a Math.PI offset)
        this.MODEL_ROTATION_OFFSET = 0;
        this.MODEL_ROTATION_X = Math.PI / 2;

        // Bowler run-up variables
        this.bowlerObj = null;
        this.bowlerState = 'idle'; // 'idle', 'waiting_runup', 'running_up', 'bowled'
        this.bowlerRunStart = new BABYLON.Vector3(0, 0, -28.5);
        this.bowlerCrease = new BABYLON.Vector3(0, 0, -22.0);
        this.bowlerSpeed = 3.25; // Speed during run-up (m/s)
        this.bowlerRunTimer = 0;

        // Fielding chase variables
        this.activeChaser = null;
        this.chaseSpeed = 7.5; // Fielder sprint speed (m/s)
        this.isBallInPlay = false;
        this.hasFielderFielded = false;

        // Default fielding positions relative to center (0,0,0)
        // 9 fielders in standard locations inside the 40m boundary
        // Fielding placement for Off Spinner (in Death Overs) as per diagram:
        // Left = OFF side (X > 0), Right = LEG side (X < 0)
        this.fielderPositions = [
            { name: "Short Third Man", pos: new BABYLON.Vector3(6.0, 0, 13.0) },
            { name: "Backward Point",  pos: new BABYLON.Vector3(13.0, 0, 8.5) },
            { name: "Deep Point",      pos: new BABYLON.Vector3(32.0, 0, 8.5) }, // Position 2
            { name: "Extra Cover",     pos: new BABYLON.Vector3(9.0, 0, -4.0) },
            { name: "Long Off",        pos: new BABYLON.Vector3(12.0, 0, -30.0) },
            { name: "Long On",         pos: new BABYLON.Vector3(-12.0, 0, -30.0) },
            { name: "Deep Mid Wicket", pos: new BABYLON.Vector3(-32.0, 0, -4.0) },
            { name: "Square Leg",      pos: new BABYLON.Vector3(-13.0, 0, 7.4) }, // Position 1
            { name: "Short Fine Leg",  pos: new BABYLON.Vector3(-6.0, 0, 13.0) }
        ];
    }

    async setup(ballModule) {
        this.ballModule = ballModule;

        // console.log("Initializing Players Module: Loading Assets...");

        // Load XBot model and animations in parallel
        const [bot, idle, run] = await Promise.all([
            BABYLON.SceneLoader.LoadAssetContainerAsync("./assets/player/bot/", "XBot.glb", this.scene),
            BABYLON.SceneLoader.LoadAssetContainerAsync("./assets/player/animation/", "idle.glb", this.scene),
            BABYLON.SceneLoader.LoadAssetContainerAsync("./assets/player/animation/", "Running.glb", this.scene)
        ]);

        this.botContainer = bot;
        this.idleContainer = idle;
        this.runContainer = run;

        // console.log("Player Assets Loaded successfully.");

        // 1. Create the Wicketkeeper behind the batsman's stumps (Z = 8.2)
        const keeperPos = new BABYLON.Vector3(0, 0, 9.8);
        const keeperRot = 0; // Faces towards bowler (looking down -Z)
        const keeperScale = new BABYLON.Vector3(1.15, 1.15, 1.15);
        this.createPlayerInstance("Wicketkeeper", "keeper", keeperPos, keeperRot, keeperScale);

        // 2. Create the Bowler near the bowling crease (Z = -22)
        const bowlerRot = Math.PI; // Faces towards batsman (looking up +Z)
        const bowlerScale = new BABYLON.Vector3(1.1, 1.1, 1.1);
        this.bowlerObj = this.createPlayerInstance("Bowler", "bowler", this.bowlerRunStart.clone(), bowlerRot, bowlerScale);

        // 3. Create the 9 Fielders in their positions
        const fielderScale = new BABYLON.Vector3(1.08, 1.08, 1.08);

        this.fielderPositions.forEach((fielder) => {
            // Calculate starting angle to face the batsman's stumps (0, 0, 7.4)
            const dx = 0 - fielder.pos.x;
            const dz = 7.4 - fielder.pos.z;
            const faceAngle = Math.atan2(dx, dz);

            this.createPlayerInstance(
                fielder.name,
                "fielder",
                fielder.pos.clone(),
                faceAngle,
                fielderScale
            );
        });

        // Register with EventBus
        EventBus.on(EventBus.GAME_EVENTS.BALL_RESET, (data) => this.onBallReset(data));
        EventBus.on(EventBus.GAME_EVENTS.SHOT_PLAYED, (data) => this.onShotPlayed(data));
        EventBus.on(EventBus.GAME_EVENTS.WICKET_DOWN, () => this.onDeliveryFinished());
        EventBus.on(EventBus.GAME_EVENTS.RUNS_SCORED, () => this.onDeliveryFinished());
        EventBus.on(EventBus.GAME_EVENTS.BOUNDARY_FOUR, () => this.onDeliveryFinished());
        EventBus.on(EventBus.GAME_EVENTS.BOUNDARY_SIX, () => this.onDeliveryFinished());

        // Register update loop
        this.scene.onBeforeRenderObservable.add(() => this.update());
        
        // Initial reset to sync positions
        this.resetPlayersToStart();
        
        // Start bowler in runup wait state for the very first ball!
        if (this.bowlerObj) {
            this.bowlerState = 'waiting_runup';
            this.bowlerRunTimer = 0;
        }
    }

    createPlayerInstance(name, type, position, rotationY, scale) {
        const instanceId = Math.random().toString(36).substring(2, 9);
        const nameProvider = (n) => n + "_" + instanceId;

        // Instantiate meshes and skeleton
        const instance = this.botContainer.instantiateModelsToScene(nameProvider, true, { doNotBindPlayPen: true });
        
        // Create a single parent TransformNode anchor for this player instance
        const playerAnchor = new BABYLON.TransformNode("player_" + instanceId, this.scene);
        
        // Parent all root nodes of the instantiated model to the playerAnchor
        instance.rootNodes.forEach(node => {
            node.setParent(playerAnchor);
        });

        // Temporarily reset anchor transforms to calculate local bounds relative to anchor origin
        playerAnchor.position.set(0, 0, 0);
        playerAnchor.rotation.set(0, 0, 0);
        playerAnchor.scaling.set(1, 1, 1);
        playerAnchor.computeWorldMatrix(true);

        // Auto-calculate model height by transforming child bounding box minimum/maximum into anchor space
        let min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
        let max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
        
        playerAnchor.getChildMeshes().forEach(mesh => {
            mesh.computeWorldMatrix(true);
            const boundingInfo = mesh.getBoundingInfo();
            const worldMin = BABYLON.Vector3.TransformCoordinates(boundingInfo.boundingBox.minimum, mesh.getWorldMatrix());
            const worldMax = BABYLON.Vector3.TransformCoordinates(boundingInfo.boundingBox.maximum, mesh.getWorldMatrix());
            min = BABYLON.Vector3.Minimize(min, worldMin);
            max = BABYLON.Vector3.Maximize(max, worldMax);
        });

        const localHeight = max.y - min.y;
        const targetHeight = 1.6; // target human height in meters
        let scaleFactor = 0.01; // fallback conversion factor (cm to m)
        if (localHeight > 0 && !isNaN(localHeight)) {
            scaleFactor = targetHeight / localHeight;
        }

        // Apply final scaling (metric scale factor * custom relative scale modifier)
        const finalScale = scale.scale(scaleFactor);
        playerAnchor.scaling.copyFrom(finalScale);

        // Apply actual position and rotation to the parent anchor
        const verticalOffset = 1.01919 * finalScale.y;
        playerAnchor.position.copyFrom(position);
        playerAnchor.position.y += verticalOffset;
        playerAnchor.rotation.set(this.MODEL_ROTATION_X, rotationY + this.MODEL_ROTATION_OFFSET, 0);

        if (name === "Bowler") {
            this.bowlerRunStart.y = verticalOffset;
            this.bowlerCrease.y = verticalOffset;
        }



        playerAnchor.getChildMeshes().forEach(mesh => {
            // Enable casting shadows for realistic presence on pitch/grass
            if (this.shadowGenerator) {
                this.shadowGenerator.addShadowCaster(mesh);
            }
        });

        // Retarget Animations from separate animation containers to our grouped hierarchy bones
        const masterIdle = this.idleContainer.animationGroups[0];
        const masterRun = this.runContainer.animationGroups[0];

        const idleAnim = this.retargetAnimationGroup(masterIdle, playerAnchor, instanceId);
        const runAnim = this.retargetAnimationGroup(masterRun, playerAnchor, instanceId);

        // Save player state
        const playerObj = {
            name,
            type,
            root: playerAnchor,
            anims: {
                idle: idleAnim,
                run: runAnim
            },
            startPos: playerAnchor.position.clone(),
            startRotY: rotationY,
            currentRotY: rotationY
        };

        this.players.push(playerObj);

        // Start playing the idle animation by default
        idleAnim.start(true, 1.0);



        return playerObj;
    }

    retargetAnimationGroup(sourceAnimGroup, clonedRootNode, instanceId) {
        const newGroup = new BABYLON.AnimationGroup(sourceAnimGroup.name + "_" + instanceId, this.scene);
        
        // Map child nodes of clonedRootNode by their original name (stripping instance suffix)
        const nodeMap = new Map();
        const suffix = "_" + instanceId;
        
        const mapNode = (node) => {
            const originalName = node.name.endsWith(suffix) 
                ? node.name.slice(0, -suffix.length) 
                : node.name;
            nodeMap.set(originalName, node);
            node.getChildren().forEach(mapNode);
        };
        mapNode(clonedRootNode);

        // Retarget animations inside group to our cloned bones
        let matchedCount = 0;
        for (const targetedAnim of sourceAnimGroup.targetedAnimations) {
            const sourceTarget = targetedAnim.target;
            if (!sourceTarget) continue;

            // Strip prefix from target name (e.g. "mixamorig_Spine" -> "Spine")
            let base = sourceTarget.name;
            if (base.startsWith("mixamorig_")) {
                base = base.substring("mixamorig_".length);
            }

            let targetNode = null;
            if (nodeMap.has(base)) {
                targetNode = nodeMap.get(base);
            } else {
                // Match base name with optional numeric suffix (e.g. "Spine_02", "Hips_01")
                for (const [key, node] of nodeMap.entries()) {
                    const regex = new RegExp("^" + base + "_\\d+$");
                    if (regex.test(key)) {
                        targetNode = node;
                        break;
                    }
                }
            }

            if (targetNode) {
                const prop = targetedAnim.animation.targetProperty;
                // Only retarget rotation channels to prevent bone/mesh distortion and height collapse
                if (prop === "scaling") continue;
                if (prop === "position") continue;

                // Clone the animation object to isolate individual skeletal controllers
                newGroup.addTargetedAnimation(targetedAnim.animation.clone(), targetNode);
                matchedCount++;
            }
        }



        return newGroup;
    }

    resetPlayersToStart() {
        this.players.forEach(player => {
            // Stop run animation, start idle
            player.anims.run.stop();
            player.anims.idle.start(true, 1.0);

            // Teleport to original positions
            player.root.position.copyFrom(player.startPos);
            player.root.rotation.set(this.MODEL_ROTATION_X, player.startRotY + this.MODEL_ROTATION_OFFSET, 0);
            player.currentRotY = player.startRotY;
        });

        this.activeChaser = null;
        this.isBallInPlay = false;
        this.hasFielderFielded = false;

        // Reset Bowler state machine
        if (this.bowlerObj) {
            this.bowlerState = 'idle';
            this.bowlerObj.root.position.copyFrom(this.bowlerRunStart);
            this.bowlerObj.root.rotation.set(this.MODEL_ROTATION_X, this.bowlerObj.startRotY + this.MODEL_ROTATION_OFFSET, 0);
        }
    }

    update() {
        if (window.gamePaused) return;

        const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;

        // 1. UPDATE BOWLER RUN-UP STATE MACHINE
        this.updateBowlerLogic(deltaTime);

        // 2. UPDATE FIELDERS DYNAMIC CHASING & ROTATION
        this.updateFieldersLogic(deltaTime);

        // 3. FORCE PLAYER HEIGHT CONSTRAINTS (Prevent ground-sinking during run cycles)
        this.players.forEach(player => {
            let targetY = player.startPos.y;
            
            // Check if this player is currently in a running state
            const isRunning = (player === this.activeChaser && this.isBallInPlay && !this.hasFielderFielded) ||
                            (player.type === 'bowler' && this.bowlerState === 'running_up');
            
            if (isRunning) {
                targetY += 0.08; // Lift slightly by 8cm when running to counteract animation leg extension clipping
            }
            
            player.root.position.y = targetY;
        });
    }

    updateBowlerLogic(deltaTime) {
        if (!this.bowlerObj) return;

        const bowler = this.bowlerObj;

        switch (this.bowlerState) {
            case 'idle':
                // Waiting at start position
                break;

            case 'waiting_runup':
                // Countdown to start running (synced with 3s ball delivery reset timeout)
                this.bowlerRunTimer += deltaTime;
                // Run-up takes ~2.0 seconds, so wait 1.0s of the 3s timeout before running
                if (this.bowlerRunTimer >= 1.0) {
                    this.bowlerState = 'running_up';
                    bowler.anims.idle.stop();
                    bowler.anims.run.start(true, 1.15); // Running animation slightly faster
                }
                break;

            case 'running_up':
                // Move bowler forward towards the crease (Z = -22.0)
                const currentPos = bowler.root.position;
                const distanceToCrease = this.bowlerCrease.z - currentPos.z;

                if (distanceToCrease > 0.15) {
                    currentPos.z += this.bowlerSpeed * deltaTime;
                    // Slightly sway on X for a realistic sprint wobble
                    currentPos.x = this.bowlerRunStart.x + Math.sin(Date.now() * 0.015) * 0.08;
                } else {
                    // Reached crease: Transition to bowled state
                    currentPos.copyFrom(this.bowlerCrease);
                    this.bowlerState = 'bowled';
                    bowler.anims.run.stop();
                    bowler.anims.idle.start(true, 1.0); // Reset to ready stance

                    // Release the ball and initialize its flight timing parameters
                    if (this.ballModule) {
                        this.ballModule.isBallReadyToBowl = true;
                        this.ballModule.bowlingStartTime = Date.now();
                        this.ballModule.idealContactTime = this.ballModule.bowlingStartTime + (29.4 / this.ballModule.velocity.z) * 1000;
                        this.ballModule.peakSwingSpeed = 0;
                        this.ballModule.peakSwingTime = 0;
                    }
                }
                break;

            case 'bowled':
                // Standing at crease, watching the shot
                this.faceTarget(bowler.root, this.ballModule.ballMesh.position);
                break;
        }
    }

    updateFieldersLogic(deltaTime) {
        if (!this.ballModule || !this.ballModule.ballMesh) return;

        const ballPos = this.ballModule.ballMesh.position;

        // If the ball has been hit and is active in the field
        if (this.isBallInPlay && !this.hasFielderFielded) {
            
            // Choose/Identify active chaser (nearest fielder to the ball on XZ plane)
            if (!this.activeChaser) {
                let minDistance = Infinity;
                let nearestFielder = null;

                this.players.forEach(player => {
                    if (player.type !== 'fielder') return;

                    const dist = BABYLON.Vector3.Distance(player.root.position, ballPos);
                    if (dist < minDistance) {
                        minDistance = dist;
                        nearestFielder = player;
                    }
                });

                if (nearestFielder) {
                    this.activeChaser = nearestFielder;
                    this.activeChaser.anims.idle.stop();
                    this.activeChaser.anims.run.start(true, 1.15); // Fast sprint anim
                }
            }

            // Move the active chaser towards the ball
            if (this.activeChaser) {
                const chaserRoot = this.activeChaser.root;
                
                // Target spot is ball's position projected on chaser height plane
                const targetSpot = new BABYLON.Vector3(ballPos.x, chaserRoot.position.y, ballPos.z);
                const toBall = targetSpot.subtract(chaserRoot.position);
                const distance = toBall.length();

                // Rotate to face the ball
                this.faceTarget(chaserRoot, targetSpot);

                if (distance > 0.8) {
                    // Sprint towards the ball
                    const moveDir = toBall.normalize();
                    chaserRoot.position.addInPlace(moveDir.scale(this.chaseSpeed * deltaTime));
                } else {
                    // FIELDED SUCCESS: Fielder has reached the ball!
                    this.hasFielderFielded = true;
                    this.activeChaser.anims.run.stop();
                    this.activeChaser.anims.idle.start(true, 1.0);

                    // Stop the ball instantly to freeze runs calculation
                    this.ballModule.velocity.set(0, 0, 0);
                    // Force the ball down to ground height
                    this.ballModule.position.y = this.ballModule.BALL_DIAMETER / 2;

                    if (this.ballModule.uiModule) {
                        this.ballModule.uiModule.showAnnouncement("FIELDED! 🖐️", "#00FFFF");
                    }
                }
            }

            // Make other fielders & keeper rotate to face the ball alertly
            this.players.forEach(player => {
                if (player === this.activeChaser) return;
                
                // Face the ball's current location
                this.faceTarget(player.root, ballPos);
            });

            // Check for Catch Dismissal:
            // Ball has been hit, is in the air, and has NOT touched the ground yet
            if (!this.ballModule.hasHitGroundAfterStroke && ballPos.y > 0.1 && ballPos.y < 2.0) {
                
                // Check if any fielder or keeper is close enough in 3D space to catch it
                this.players.forEach(player => {
                    if (player.type === 'bowler') return; // Bowler is bowling and watching
                    if (this.hasFielderFielded) return;

                    // horizontal distance check (on the grass)
                    const distXZ = BABYLON.Vector2.Distance(
                        new BABYLON.Vector2(player.root.position.x, player.root.position.z),
                        new BABYLON.Vector2(ballPos.x, ballPos.z)
                    );
                    
                    // vertical height reach check (under player height limit)
                    const isWithinReachHeight = ballPos.y >= 0.2 && ballPos.y <= 2.2;

                    if (distXZ < 0.95 && isWithinReachHeight) {
                        // CATCH TAKEN!
                        this.hasFielderFielded = true;
                        
                        // Stop chaser running
                        if (this.activeChaser) {
                            this.activeChaser.anims.run.stop();
                            this.activeChaser.anims.idle.start(true, 1.0);
                        }

                        player.anims.run.stop();
                        player.anims.idle.start(true, 1.0);

                        // Stop the ball physics
                        this.ballModule.velocity.set(0, 0, 0);
                        this.ballModule.hasHitHandOrStumps = true;

                        // Emit Wicket Event
                        EventBus.emit(EventBus.GAME_EVENTS.WICKET_DOWN, {
                            dismissalType: 'caught',
                            position: ballPos.clone()
                        });

                        if (this.ballModule.uiModule) {
                            this.ballModule.uiModule.registerWicket();
                            const { timingDiff, timingText, noSwing } = this.ballModule.getTimingData();
                            this.ballModule.uiModule.showTimingMeter(timingDiff, timingText, noSwing, "CAUGHT OUT! 🖐️🛑", "#FF3333");
                        }

                        // Schedule delivery reset
                        setTimeout(() => { this.ballModule.resetDelivery(true); }, 2000);
                    }
                });
            }

        } else {
            // Ball is not hit yet: Everyone faces the batsman at (0, 0, 7.4)
            const targetPos = new BABYLON.Vector3(0, 0, 7.4);
            this.players.forEach(player => {
                if (player.type === 'bowler' && this.bowlerState === 'running_up') return;
                this.faceTarget(player.root, targetPos);
            });
        }
    }

    faceTarget(mesh, targetPos) {
        const dx = targetPos.x - mesh.position.x;
        const dz = targetPos.z - mesh.position.z;
        const angle = Math.atan2(dx, dz);
        mesh.rotation.y = angle + this.MODEL_ROTATION_OFFSET;
    }

    onBallReset(data) {
        const autoBowl = data?.autoBowl ?? false;
        
        // Reset player positions and states
        this.resetPlayersToStart();

        // If it's an autoBowl, start the bowler runup timer countdown
        if (autoBowl && this.bowlerObj) {
            this.bowlerState = 'waiting_runup';
            this.bowlerRunTimer = 0;
        } else if (this.bowlerObj) {
            // Teleport directly to crease if immediate delivery
            this.bowlerState = 'bowled';
            this.bowlerObj.root.position.copyFrom(this.bowlerCrease);
        }
    }

    onShotPlayed(data) {
        // Struck! Ball is now in play, start fielders chasing
        this.isBallInPlay = true;
        this.hasFielderFielded = false;
        this.activeChaser = null;
    }

    onDeliveryFinished() {
        // Ball play is over (registered a wicket, runs, or boundary)
        this.isBallInPlay = false;
        
        // Return active chaser back to idle animation
        if (this.activeChaser) {
            this.activeChaser.anims.run.stop();
            this.activeChaser.anims.idle.start(true, 1.0);
        }
    }
}
