// src/environment/wickets.js
export default class EnvironmentWickets {
    constructor(scene, shadowGenerator) {
        this.scene = scene;
        this.shadowGenerator = shadowGenerator;
        this.stumpMaterial = null;
        this.bailMaterial = null;
        

        this.STUMP_DIAMETER = 0.04;
        this.STUMP_HEIGHT = 0.71;
        this.Z_POSITION = 8.2; // MOVED: Now sits right behind the batsman's guard line
        this.BOWLER_Z_POSITION = -11.92; // Bowler side stumps
        this.STUMP_SPACING = 0.06;

        this.leftBail = null;
        this.rightBail = null;
        this.isSmashed = false;

        this.bailsPhysics = {
            left: { pos: new BABYLON.Vector3(), vel: new BABYLON.Vector3(), rotVel: 0 },
            right: { pos: new BABYLON.Vector3(), vel: new BABYLON.Vector3(), rotVel: 0 }
        };

        this.GRAVITY = -9.8;
    }

    setup() {
        this.createMaterials();
        this.createStumps();
        this.createBails();
        this.registerBailAnimateLoop();
    }

    createMaterials() {
        this.stumpMaterial = new BABYLON.StandardMaterial("stumpMaterial", this.scene);
        this.stumpMaterial.diffuseColor = new BABYLON.Color3(0.76, 0.60, 0.42);
        this.stumpMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        this.bailMaterial = new BABYLON.StandardMaterial("bailMaterial", this.scene);
        this.bailMaterial.diffuseColor = new BABYLON.Color3(0.66, 0.50, 0.32);
    }

    createStumps() {
        // Batting end stumps
        for (let i = -1; i <= 1; i++) {
            const stump = BABYLON.MeshBuilder.CreateCylinder("stump_" + i, {
                diameterTop: this.STUMP_DIAMETER,
                diameterBottom: this.STUMP_DIAMETER,
                height: this.STUMP_HEIGHT
            }, this.scene);

            stump.position = new BABYLON.Vector3(i * this.STUMP_SPACING, this.STUMP_HEIGHT / 2, this.Z_POSITION);
            stump.material = this.stumpMaterial;

            if (this.shadowGenerator) {
                this.shadowGenerator.addShadowCaster(stump);
            }
        }

        // Bowler end stumps
        for (let i = -1; i <= 1; i++) {
            const stump = BABYLON.MeshBuilder.CreateCylinder("bowler_stump_" + i, {
                diameterTop: this.STUMP_DIAMETER,
                diameterBottom: this.STUMP_DIAMETER,
                height: this.STUMP_HEIGHT
            }, this.scene);

            stump.position = new BABYLON.Vector3(i * this.STUMP_SPACING, this.STUMP_HEIGHT / 2, this.BOWLER_Z_POSITION);
            stump.material = this.stumpMaterial;

            if (this.shadowGenerator) {
                this.shadowGenerator.addShadowCaster(stump);
            }
        }
    }

    createBails() {
        const bailDiameter = 0.015;
        const bailLength = 0.11;
        const bailYPosition = this.STUMP_HEIGHT + (bailDiameter / 2);

        // Batting end bails
        this.leftBail = BABYLON.MeshBuilder.CreateCylinder("leftBail", {
            diameterTop: bailDiameter,
            diameterBottom: bailDiameter,
            height: bailLength
        }, this.scene);
        this.leftBail.rotation.z = Math.PI / 2;
        this.leftBail.position = new BABYLON.Vector3(-0.03, bailYPosition, this.Z_POSITION);
        this.leftBail.material = this.bailMaterial;

        this.rightBail = BABYLON.MeshBuilder.CreateCylinder("rightBail", {
            diameterTop: bailDiameter,
            diameterBottom: bailDiameter,
            height: bailLength
        }, this.scene);
        this.rightBail.rotation.z = Math.PI / 2;
        this.rightBail.position = new BABYLON.Vector3(0.03, bailYPosition, this.Z_POSITION);
        this.rightBail.material = this.bailMaterial;

        // Bowler end bails
        const bowlerLeftBail = BABYLON.MeshBuilder.CreateCylinder("bowlerLeftBail", {
            diameterTop: bailDiameter,
            diameterBottom: bailDiameter,
            height: bailLength
        }, this.scene);
        bowlerLeftBail.rotation.z = Math.PI / 2;
        bowlerLeftBail.position = new BABYLON.Vector3(-0.03, bailYPosition, this.BOWLER_Z_POSITION);
        bowlerLeftBail.material = this.bailMaterial;

        const bowlerRightBail = BABYLON.MeshBuilder.CreateCylinder("bowlerRightBail", {
            diameterTop: bailDiameter,
            diameterBottom: bailDiameter,
            height: bailLength
        }, this.scene);
        bowlerRightBail.rotation.z = Math.PI / 2;
        bowlerRightBail.position = new BABYLON.Vector3(0.03, bailYPosition, this.BOWLER_Z_POSITION);
        bowlerRightBail.material = this.bailMaterial;

        if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(this.leftBail);
            this.shadowGenerator.addShadowCaster(this.rightBail);
            this.shadowGenerator.addShadowCaster(bowlerLeftBail);
            this.shadowGenerator.addShadowCaster(bowlerRightBail);
        }

        this.bailsPhysics.left.pos = this.leftBail.position.clone();
        this.bailsPhysics.right.pos = this.rightBail.position.clone();
    }

    triggerBowled() {
        if (this.isSmashed) return;
        this.isSmashed = true;

        // Bails fly backwards behind the stumps (+Z direction)
        this.bailsPhysics.left.vel = new BABYLON.Vector3(-1.0, 3.0, 4);
        this.bailsPhysics.left.rotVel = 5;

        this.bailsPhysics.right.vel = new BABYLON.Vector3(1.0, 3.5, 4);
        this.bailsPhysics.right.rotVel = -6;
    }

    registerBailAnimateLoop() {
        this.scene.onBeforeRenderObservable.add(() => {
            if (!this.isSmashed) return;

            const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;

            this.bailsPhysics.left.vel.y += this.GRAVITY * deltaTime;
            this.bailsPhysics.left.pos.addInPlace(this.bailsPhysics.left.vel.scale(deltaTime));
            this.leftBail.position.copyFrom(this.bailsPhysics.left.pos);
            this.leftBail.rotation.x += this.bailsPhysics.left.rotVel * deltaTime;

            this.bailsPhysics.right.vel.y += this.GRAVITY * deltaTime;
            this.bailsPhysics.right.pos.addInPlace(this.bailsPhysics.right.vel.scale(deltaTime));
            this.rightBail.position.copyFrom(this.bailsPhysics.right.pos);
            this.rightBail.rotation.y += this.bailsPhysics.right.rotVel * deltaTime;

            if (this.leftBail.position.y < 0.01) {
                this.leftBail.position.y = 0.01;
                this.bailsPhysics.left.vel.set(0, 0, 0);
                this.bailsPhysics.left.rotVel = 0;
            }
            if (this.rightBail.position.y < 0.01) {
                this.rightBail.position.y = 0.01;
                this.bailsPhysics.right.vel.set(0, 0, 0);
                this.bailsPhysics.right.rotVel = 0;
            }
        });
    }

    resetWickets() {
        this.isSmashed = false;
        const bailDiameter = 0.015;
        const bailYPosition = this.STUMP_HEIGHT + (bailDiameter / 2);

        this.bailsPhysics.left.pos = new BABYLON.Vector3(-0.03, bailYPosition, this.Z_POSITION);
        this.leftBail.position.copyFrom(this.bailsPhysics.left.pos);
        this.leftBail.rotation.set(0, 0, Math.PI / 2);

        this.bailsPhysics.right.pos = new BABYLON.Vector3(0.03, bailYPosition, this.Z_POSITION);
        this.rightBail.position.copyFrom(this.bailsPhysics.right.pos);
        this.rightBail.rotation.set(0, 0, Math.PI / 2);
    }
}