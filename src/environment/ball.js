// src/environment/ball.js

/**
 * Environment Ball Module
 * Responsibilities: Simulating flight gravity, pitch bouncing, hand-strike deflections,
 * tracking broken wickets, and checking real-time boundary rope crossovers (4s and 6s)
 * along with in-field run scoring modifications.
 */
export default class EnvironmentBall {
    constructor(scene, shadowGenerator) {
        this.scene = scene;
        this.shadowGenerator = shadowGenerator;
        this.ballMesh = null;
        this.targetHandGroup = null;
        this.targetWicketsModule = null;
        this.uiModule = null;
        this.cameraModule = null;

        this.BALL_DIAMETER = 0.072;
        this.GRAVITY = -9.8;

        // Balanced initial positioning values
        this.position = new BABYLON.Vector3(0, 1.9, -22);
        this.velocity = new BABYLON.Vector3(0, -0.8, 22);

        this.swingForce = 0;
        this.isAnimating = true;
        this.hasHitHandOrStumps = false;

        // BOUNDARY TRACKING STATE
        this.hasHitGroundAfterStroke = false;
        this.boundaryRegistered = false;
        this.BOUNDARY_RADIUS = 40.0; // Matches stadium outer rope boundary perimeter
    }

    setup(handGroup, wicketsModule, uiModule, cameraModule) {
        this.targetHandGroup = handGroup;
        this.targetWicketsModule = wicketsModule;
        this.uiModule = uiModule;
        this.cameraModule = cameraModule;

        this.createBallGeometry();
        this.applyBallMaterial();

        if (this.cameraModule) {
            this.cameraModule.setBallReference(this.ballMesh);
        }

        this.registerPhysicsLoop();
        return this.ballMesh;
    }

    createBallGeometry() {
        this.ballMesh = BABYLON.MeshBuilder.CreateSphere("cricketBall", {
            diameter: this.BALL_DIAMETER,
            segments: 16
        }, this.scene);
        this.ballMesh.position = this.position.clone();

        if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(this.ballMesh);
        }
    }

    applyBallMaterial() {
        const ballMaterial = new BABYLON.StandardMaterial("ballMaterial", this.scene);
        ballMaterial.diffuseColor = new BABYLON.Color3(0.85, 0.05, 0.05);
        ballMaterial.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        this.ballMesh.material = ballMaterial;
    }

    registerPhysicsLoop() {
        this.scene.onBeforeRenderObservable.add(() => {
            if (!this.isAnimating) return;

            const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;

            this.velocity.y += this.GRAVITY * deltaTime;
            this.velocity.x += this.swingForce * deltaTime;

            this.position.x += this.velocity.x * deltaTime;
            this.position.y += this.velocity.y * deltaTime;
            this.position.z += this.velocity.z * deltaTime;

            // Pitch turf and outfield ground bouncing collision
            const ballRadius = this.BALL_DIAMETER / 2;
            if (this.position.y <= ballRadius) {
                this.position.y = ballRadius;
                this.velocity.y = -this.velocity.y * 0.65; // Bounce energy loss
                this.swingForce *= 0.1;

                // Track if the ball has hit the turf after a player strike deflection
                if (this.hasHitHandOrStumps) {
                    this.hasHitGroundAfterStroke = true;
                }
            }

            // A. Hand Collision Proxy Detection window
            if (this.targetHandGroup && !this.hasHitHandOrStumps) {
                const handPos = this.targetHandGroup.position;

                // Checks if ball enters the 3D bounding frame of your open palm striker proxy mesh
                if (Math.abs(this.position.x - handPos.x) < 0.35 &&
                    Math.abs(this.position.y - handPos.y) < 0.35 &&
                    Math.abs(this.position.z - handPos.z) < 0.30) {

                    this.hasHitHandOrStumps = true;

                    // Calculate deflection angles based on accuracy distance from hand target center
                    const strikeError = Math.abs(this.position.x - handPos.x);

                    // RE-TUNED EXCELERATION LAUNCH VARIABLES (POWER BOOST)
                    this.velocity.z = -Math.abs(this.velocity.z) * 2.5;
                    this.velocity.x = (this.position.x - handPos.x) * 35;

                    // Sweet spot strikes shoot into the air with enough power for boundaries
                    if (strikeError < 0.12) {
                        this.velocity.y = 18.0 + (Math.random() * 4.0);
                        this.velocity.z *= 1.5;
                    } else {
                        this.velocity.y = 4.0 + (Math.random() * 2.0);
                    }

                    if (this.cameraModule) {
                        this.cameraModule.startTracking();
                    }
                }
            }

            // B. Wicket Collision Checks
            if (this.targetWicketsModule && !this.targetWicketsModule.isSmashed && !this.hasHitHandOrStumps) {
                const wicketZ = this.targetWicketsModule.Z_POSITION;
                const wicketHeight = this.targetWicketsModule.STUMP_HEIGHT;

                if (Math.abs(this.position.z - wicketZ) < 0.15 &&
                    this.position.y < wicketHeight &&
                    Math.abs(this.position.x) < 0.12) {

                    this.hasHitHandOrStumps = true;
                    this.targetWicketsModule.triggerBowled();
                    this.velocity.set(0, 1.5, 3.0);

                    if (this.uiModule) this.uiModule.registerWicket();

                    setTimeout(() => {
                        this.resetDelivery();
                    }, 2000);
                    return;
                }
            }

            // C. LIVE BOUNDARY ROPE DETECTION
            if (this.hasHitHandOrStumps && !this.boundaryRegistered && !this.targetWicketsModule.isSmashed) {
                const distanceFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);

                if (distanceFromCenter >= this.BOUNDARY_RADIUS) {
                    this.boundaryRegistered = true;

                    if (this.hasHitGroundAfterStroke) {
                        if (this.uiModule) this.uiModule.addRuns(4);
                    } else {
                        if (this.uiModule) this.uiModule.addRuns(6);
                    }

                    setTimeout(() => {
                        this.resetDelivery();
                    }, 1200);
                    return;
                }
            }

            this.ballMesh.position.copyFrom(this.position);

            // D. IN-FIELD RUN SCORING & DISMISSAL RESETS
            if (this.hasHitHandOrStumps) {
                // If the ball slows down significantly or goes deep into the pitch gaps without touching the boundary ropes
                if (!this.boundaryRegistered && (this.position.z < -40 || Math.abs(this.position.x) > 25 || this.velocity.length() < 1.5)) {
                    this.boundaryRegistered = true;

                    // Assign runs dynamically based on the travel distance along the outfield
                    const travelDistance = Math.abs(this.position.z);
                    let runsScored = 1;
                    if (travelDistance > 25) runsScored = 3;
                    else if (travelDistance > 15) runsScored = 2;

                    if (this.uiModule) {
                        this.uiModule.addRuns(runsScored);
                    }

                    setTimeout(() => { this.resetDelivery(); }, 1500);
                }
            } else {
                // Default safety reset if the ball gets missed completely by the player
                if (this.position.z > 12 || this.position.z < -45) {
                    this.resetDelivery();
                }
            }
        });
    }

    resetDelivery() {
        if (!this.boundaryRegistered && !this.targetWicketsModule.isSmashed) {
            if (this.uiModule) {
                this.uiModule.incrementBall();
                this.uiModule.updateDisplay();
            }
        }

        this.hasHitHandOrStumps = false;
        this.hasHitGroundAfterStroke = false;
        this.boundaryRegistered = false;

        const randomPace = 22 + Math.random() * 6;
        const randomHeight = 1.8 + Math.random() * 0.2;
        const randomLineOffset = (Math.random() - 0.5) * 0.12;

        this.position = new BABYLON.Vector3(randomLineOffset, randomHeight, -22);
        this.velocity = new BABYLON.Vector3((Math.random() - 0.5) * 0.2, -0.6, randomPace);
        this.swingForce = (Math.random() - 0.5) * 1.8;

        this.ballMesh.position.copyFrom(this.position);

        if (this.targetWicketsModule) {
            this.targetWicketsModule.resetWickets();
        }

        if (this.cameraModule) {
            this.cameraModule.resetToStance();
        }
    }
}