/**
 * Environment Ball Module
 * Responsibilities: Simulating flight gravity, pitch bouncing, bat deflections,
 * tracking broken wickets, and checking real-time boundary rope crossovers (4s and 6s).
 */
export default class EnvironmentBall {
    constructor(scene, shadowGenerator) {
        this.scene = scene;
        this.shadowGenerator = shadowGenerator;
        this.ballMesh = null;
        this.targetBatGroup = null;
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
        this.hasHitBatOrStumps = false;

        // BOUNDARY TRACKING STATE
        this.hasHitGroundAfterStroke = false;
        this.boundaryRegistered = false;
        this.BOUNDARY_RADIUS = 40.0; // Matches your stadium outer rope boundary
    }

    setup(batGroup, wicketsModule, uiModule, cameraModule) {
        this.targetBatGroup = batGroup;
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

                // Track if the ball has hit the turf after a bat deflection
                if (this.hasHitBatOrStumps) {
                    this.hasHitGroundAfterStroke = true;
                }
            }

            // A. Playable Bat Collision Intersection
            if (this.targetBatGroup && !this.hasHitBatOrStumps) {
                const batPos = this.targetBatGroup.position;
                if (Math.abs(this.position.x - batPos.x) < 0.22 &&
                    Math.abs(this.position.y - batPos.y) < 0.5 &&
                    Math.abs(this.position.z - batPos.z) < 0.25) {

                    this.hasHitBatOrStumps = true;

                    // Calculate horizontal accuracy (sweet spot check)
                    const strikeError = Math.abs(this.position.x - batPos.x);

                    // Standard forward/backward velocity deflection
                    this.velocity.z = -Math.abs(this.velocity.z) * 1.6;
                    this.velocity.x = (this.position.x - batPos.x) * 24;

                    // IMPROVEMENT 1: Give clean, sweet-spot strikes a true towering launch arc!
                    if (strikeError < 0.06) {
                        // High launch trajectory for a dramatic six
                        this.velocity.y = 14.5 + (Math.random() * 3.0);
                        // Add extra forward carry to make sure it sails over the rope easily
                        this.velocity.z *= 1.3;
                    } else {
                        // Standard ground/lofted drive for standard hits
                        this.velocity.y = 4.0 + (Math.random() * 3.0);
                    }

                    if (this.cameraModule) {
                        this.cameraModule.startTracking();
                    }
                }
            }

            // B. Wicket Collision Checks
            if (this.targetWicketsModule && !this.targetWicketsModule.isSmashed && !this.hasHitBatOrStumps) {
                const wicketZ = this.targetWicketsModule.Z_POSITION;
                const wicketHeight = this.targetWicketsModule.STUMP_HEIGHT;

                if (Math.abs(this.position.z - wicketZ) < 0.15 &&
                    this.position.y < wicketHeight &&
                    Math.abs(this.position.x) < 0.12) {

                    this.hasHitBatOrStumps = true;
                    this.targetWicketsModule.triggerBowled();
                    this.velocity.set(0, 1.5, 3.0); // Bails/ball deflection spray

                    if (this.uiModule) this.uiModule.registerWicket();

                    // IMPROVEMENT 2: Snappy 2-second timeout reset right after getting bowled!
                    setTimeout(() => {
                        this.resetDelivery();
                    }, 2000);
                    return;
                }
            }

            // C. LIVE BOUNDARY ROPE DETECTION
            if (this.hasHitBatOrStumps && !this.boundaryRegistered && !this.targetWicketsModule.isSmashed) {
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

            // Default safety reset if the ball gets missed completely by the batsman
            if (!this.hasHitBatOrStumps && (this.position.z > 12 || this.position.z < -45)) {
                this.resetDelivery();
            }
        });
    }

    resetDelivery() {
        // If it was a clean dot ball (missed completely past wickets), safely increment the display
        if (!this.boundaryRegistered && !this.targetWicketsModule.isSmashed) {
            if (this.uiModule) {
                this.uiModule.incrementBall();
                this.uiModule.updateDisplay();
            }
        }

        // Reset state variables
        this.hasHitBatOrStumps = false;
        this.hasHitGroundAfterStroke = false;
        this.boundaryRegistered = false;

        // Tuned bowling physics variation ranges
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