/**
 * Environment Ball Module
 * Responsibilities: Simulating flight gravity, pitch bouncing, bat deflections,
 * tracking broken wickets, and injecting randomized swing/pace bowling variations.
 */
export default class EnvironmentBall {
    constructor(scene, shadowGenerator) {
        this.scene = scene;
        this.shadowGenerator = shadowGenerator;
        this.ballMesh = null;
        this.targetBatGroup = null;
        this.targetWicketsModule = null;
        this.uiModule = null;

        this.BALL_DIAMETER = 0.072;
        this.GRAVITY = -9.8;

        // Upgraded initial trajectory presets
        this.position = new BABYLON.Vector3(0, 1.4, -12);
        this.velocity = new BABYLON.Vector3(0, -1.8, 22);

        this.swingForce = 0;
        this.isAnimating = true;
        this.hasHitBatOrStumps = false;
    }

    setup(batGroup, wicketsModule, uiModule) {
        this.targetBatGroup = batGroup;
        this.targetWicketsModule = wicketsModule;
        this.uiModule = uiModule;

        this.createBallGeometry();
        this.applyBallMaterial();
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
        ballMaterial.diffuseColor = new BABYLON.Color3(0.65, 0.08, 0.08);
        ballMaterial.specularColor = new BABYLON.Color3(0.4, 0.4, 0.4);
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

            // Pitch turf bouncing collision
            const ballRadius = this.BALL_DIAMETER / 2;
            if (this.position.y <= ballRadius) {
                this.position.y = ballRadius;
                // Kicks the ball up sharply off the surface
                this.velocity.y = -this.velocity.y * 0.62;
                this.swingForce *= 0.1;
            }

            // A. Playable Bat Collision Intersection
            if (this.targetBatGroup && !this.hasHitBatOrStumps) {
                const batPos = this.targetBatGroup.position;
                if (Math.abs(this.position.x - batPos.x) < 0.25 &&
                    Math.abs(this.position.y - batPos.y) < 0.6 &&
                    Math.abs(this.position.z - batPos.z) < 0.3) {

                    this.hasHitBatOrStumps = true;

                    this.velocity.z = -this.velocity.z * 1.3;
                    this.velocity.x = (this.position.x - batPos.x) * 18;
                    this.velocity.y = Math.abs(this.velocity.y) * 1.6;

                    const strikeError = Math.abs(this.position.x - batPos.x);
                    const scoredRuns = strikeError < 0.07 ? 6 : 4;

                    if (this.uiModule) this.uiModule.addRuns(scoredRuns);
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
                    this.velocity.z = this.velocity.z * 0.3;

                    if (this.uiModule) this.uiModule.registerWicket();
                }
            }

            this.ballMesh.position.copyFrom(this.position);

            if (this.position.z > 16 || this.position.z < -16) {
                this.resetDelivery();
            }
        });
    }

    resetDelivery() {
        this.hasHitBatOrStumps = false;

        const randomPace = 18 + Math.random() * 7;
        const randomHeight = 1.3 + Math.random() * 0.3;
        const randomLineOffset = (Math.random() - 0.5) * 0.5;

        this.position = new BABYLON.Vector3(0, randomHeight, -12);
        // Firm downward trajectory entry angle (-1.8) across all variations
        this.velocity = new BABYLON.Vector3(randomLineOffset, -1.8, randomPace);

        this.swingForce = (Math.random() - 0.5) * 4.8;

        this.ballMesh.position.copyFrom(this.position);

        if (this.targetWicketsModule) {
            this.targetWicketsModule.resetWickets();
        }
    }
}