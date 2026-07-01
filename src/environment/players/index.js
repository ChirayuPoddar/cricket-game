import EventBus from '../../core/EventBus.js';
import {
    MODEL_ROTATION_OFFSET,
    MODEL_ROTATION_X,
    BOWLER_CREASE,
    BOWLER_RUN_START,
    BOWLER_SPEED,
    CHASE_SPEED,
    DEFAULT_FIELDERS
} from './constants.js';
import { createPlayerInstance, retargetAnimationGroup } from './setup.js';
import { updateBowlerLogic, getBowlerRightArmNode, getBowlerRightForeArmNode, getBowlerHandPosition } from './bowler.js';
import { updateFieldersLogic, faceTarget } from './fielder.js';

export default class EnvironmentPlayers {
    constructor(scene, shadowGenerator) {
        this.scene = scene;
        this.shadowGenerator = shadowGenerator;

        this.ballModule = null;
        this.players = [];

        this.botContainer = null;
        this.idleContainer = null;
        this.runContainer = null;

        this.MODEL_ROTATION_OFFSET = MODEL_ROTATION_OFFSET;
        this.MODEL_ROTATION_X = MODEL_ROTATION_X;

        this.bowlerObj = null;
        this.bowlerState = 'idle';
        this.bowlerRunStart = new BABYLON.Vector3(BOWLER_RUN_START.x, BOWLER_RUN_START.y, BOWLER_RUN_START.z);
        this.bowlerCrease = new BABYLON.Vector3(BOWLER_CREASE.x, BOWLER_CREASE.y, BOWLER_CREASE.z);
        this.bowlerSpeed = BOWLER_SPEED;
        this.bowlerRunTimer = 0;
        this.deliveryTimer = 0;
        this.hasReleasedBall = false;

        this.bowlerRightArmNode = null;
        this.bowlerRightForeArmNode = null;
        this.bowlerHandNode = null;
        this.bowlerRightArmDefaultRot = null;
        this.bowlerRightForeArmDefaultRot = null;
        this.bowlerHandDefaultRot = null;

        this.activeChasers = [];
        this.chaseSpeed = CHASE_SPEED;
        this.isBallInPlay = false;
        this.hasFielderFielded = false;

        this.fielderPositions = DEFAULT_FIELDERS.map(f => ({
            name: f.name,
            pos: new BABYLON.Vector3(f.pos.x, f.pos.y, f.pos.z)
        }));
    }

    async setup(ballModule) {
        this.ballModule = ballModule;

        const [bot, idle, run] = await Promise.all([
            BABYLON.SceneLoader.LoadAssetContainerAsync("./assets/player/bot/", "XBot.glb", this.scene),
            BABYLON.SceneLoader.LoadAssetContainerAsync("./assets/player/animation/", "idle.glb", this.scene),
            BABYLON.SceneLoader.LoadAssetContainerAsync("./assets/player/animation/", "Running.glb", this.scene)
        ]);

        this.botContainer = bot;
        this.idleContainer = idle;
        this.runContainer = run;

        const keeperPos = new BABYLON.Vector3(0, 0, 12.0);
        const keeperRot = 0;
        const keeperScale = new BABYLON.Vector3(1.15, 1.15, 1.15);
        this.createPlayerInstance("Wicketkeeper", "keeper", keeperPos, keeperRot, keeperScale);

        const bowlerRot = Math.PI;
        const bowlerScale = new BABYLON.Vector3(1.1, 1.1, 1.1);
        this.bowlerObj = this.createPlayerInstance("Bowler", "bowler", this.bowlerRunStart.clone(), bowlerRot, bowlerScale);

        const fielderScale = new BABYLON.Vector3(1.08, 1.08, 1.08);
        this.fielderPositions.forEach((fielder) => {
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

        EventBus.on(EventBus.GAME_EVENTS.BALL_RESET, (data) => this.onBallReset(data));
        EventBus.on(EventBus.GAME_EVENTS.SHOT_PLAYED, (data) => this.onShotPlayed(data));
        EventBus.on(EventBus.GAME_EVENTS.WICKET_DOWN, () => this.onDeliveryFinished());
        EventBus.on(EventBus.GAME_EVENTS.RUNS_SCORED, () => this.onDeliveryFinished());
        EventBus.on(EventBus.GAME_EVENTS.BOUNDARY_FOUR, () => this.onDeliveryFinished());
        EventBus.on(EventBus.GAME_EVENTS.BOUNDARY_SIX, () => this.onDeliveryFinished());

        this.scene.onBeforeRenderObservable.add(() => this.update());

        this.resetPlayersToStart();

        if (this.bowlerObj) {
            this.bowlerState = 'waiting_runup';
            this.bowlerRunTimer = 0;
        }
    }

    createPlayerInstance(name, type, position, rotationY, scale) {
        return createPlayerInstance(this, name, type, position, rotationY, scale);
    }

    retargetAnimationGroup(sourceAnimGroup, clonedRootNode, instanceId) {
        return retargetAnimationGroup(this, sourceAnimGroup, clonedRootNode, instanceId);
    }

    resetPlayersToStart() {
        this.players.forEach(player => {
            player.anims.run.stop();
            player.anims.idle.start(true, 1.0);
            player.anims.idle.goToFrame(0);

            player.root.position.copyFrom(player.startPos);
            player.root.rotation.set(this.MODEL_ROTATION_X, player.startRotY + this.MODEL_ROTATION_OFFSET, 0);
            player.currentRotY = player.startRotY;
        });

        this.activeChasers = [];
        this.isBallInPlay = false;
        this.hasFielderFielded = false;

        if (this.bowlerObj) {
            this.bowlerState = 'idle';
            this.bowlerObj.root.position.copyFrom(this.bowlerRunStart);
            this.bowlerObj.root.rotation.set(this.MODEL_ROTATION_X, this.bowlerObj.startRotY + this.MODEL_ROTATION_OFFSET, 0);

            const arm = this.getBowlerRightArmNode();
            if (arm && this.bowlerRightArmDefaultRot) {
                arm.rotationQuaternion = this.bowlerRightArmDefaultRot.clone();
            }
            const foreArm = this.getBowlerRightForeArmNode();
            if (foreArm && this.bowlerRightForeArmDefaultRot) {
                foreArm.rotationQuaternion = this.bowlerRightForeArmDefaultRot.clone();
            }
            if (this.bowlerHandNode && this.bowlerHandDefaultRot) {
                this.bowlerHandNode.rotationQuaternion = this.bowlerHandDefaultRot.clone();
            }
            if (this.bowlerObj.skeleton) {
                this.bowlerObj.skeleton.computeAbsoluteTransforms();
            }
        }
    }

    update() {
        if (window.gamePaused) return;

        const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;

        updateBowlerLogic(this, deltaTime);
        updateFieldersLogic(this, deltaTime);

        this.players.forEach(player => {
            let targetY = player.startPos.y;

            const isRunning = (this.activeChasers.includes(player) && this.isBallInPlay && !this.hasFielderFielded) ||
                (player.type === 'bowler' && this.bowlerState === 'running_up');

            if (isRunning) {
                targetY += 0.08;
            }

            player.root.position.y = targetY;
        });
    }

    faceTarget(mesh, targetPos) {
        faceTarget(this, mesh, targetPos);
    }

    onBallReset(data) {
        const autoBowl = data?.autoBowl ?? false;
        this.resetPlayersToStart();

        if (autoBowl && this.bowlerObj) {
            this.bowlerState = 'waiting_runup';
            this.bowlerRunTimer = 0;
        } else if (this.bowlerObj) {
            this.bowlerState = 'bowled';
            this.bowlerObj.root.position.copyFrom(this.bowlerCrease);
        }
    }

    onShotPlayed(data) {
        this.isBallInPlay = true;
        this.hasFielderFielded = false;
        this.activeChasers = [];
    }

    onDeliveryFinished() {
        this.isBallInPlay = false;
        this.activeChasers.forEach(chaser => {
            chaser.anims.run.stop();
            chaser.anims.idle.start(true, 1.0);
        });
        this.activeChasers = [];
    }

    getBowlerRightArmNode() {
        return getBowlerRightArmNode(this);
    }

    getBowlerRightForeArmNode() {
        return getBowlerRightForeArmNode(this);
    }

    getBowlerHandPosition() {
        return getBowlerHandPosition(this);
    }
}
