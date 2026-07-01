import { MODEL_ROTATION_X, MODEL_ROTATION_OFFSET } from './constants.js';

export function updateBowlerLogic(playersMod, deltaTime) {
    if (!playersMod.bowlerObj) return;

    const bowler = playersMod.bowlerObj;

    switch (playersMod.bowlerState) {
        case 'idle':
            break;

        case 'waiting_runup':
            playersMod.bowlerRunTimer += deltaTime;
            if (playersMod.bowlerRunTimer >= 1.0) {
                playersMod.bowlerState = 'running_up';
                bowler.anims.idle.stop();
                bowler.anims.run.start(true, 1.15);
            }
            break;

        case 'running_up':
            const currentPos = bowler.root.position;
            const distanceToCrease = playersMod.bowlerCrease.z - currentPos.z;

            if (distanceToCrease > 0.15) {
                currentPos.z += playersMod.bowlerSpeed * deltaTime;
                currentPos.x = playersMod.bowlerRunStart.x + Math.sin(Date.now() * 0.015) * 0.08;
            } else {
                currentPos.copyFrom(playersMod.bowlerCrease);
                playersMod.bowlerState = 'bowling_delivery';
                playersMod.deliveryTimer = 0;
                playersMod.hasReleasedBall = false;
                bowler.anims.run.stop();
            }
            break;

        case 'bowling_delivery':
            playersMod.deliveryTimer += deltaTime;
            const duration = 0.45;
            const t = Math.min(1.0, playersMod.deliveryTimer / duration);

            const rightArmNode = getBowlerRightArmNode(playersMod);
            const rightForeArmNode = getBowlerRightForeArmNode(playersMod);

            if (rightForeArmNode && playersMod.bowlerRightForeArmDefaultRot) {
                rightForeArmNode.rotationQuaternion.copyFrom(playersMod.bowlerRightForeArmDefaultRot);
            }

            getBowlerHandPosition(playersMod);
            if (playersMod.bowlerHandNode && playersMod.bowlerHandDefaultRot) {
                playersMod.bowlerHandNode.rotationQuaternion.copyFrom(playersMod.bowlerHandDefaultRot);
            }

            if (rightArmNode) {
                const armT = Math.min(0.70, t);
                const phi = -Math.PI * 0.7 + armT * Math.PI * 1.6;

                rightArmNode.rotationQuaternion = BABYLON.Quaternion.Identity();
                rightArmNode.rotate(BABYLON.Axis.Z, -Math.PI / 2, BABYLON.Space.WORLD);
                rightArmNode.rotate(BABYLON.Axis.X, phi, BABYLON.Space.WORLD);
            }

            if (bowler.skeleton) {
                bowler.skeleton.computeAbsoluteTransforms();
            }

            if (t >= 0.70 && !playersMod.hasReleasedBall) {
                playersMod.hasReleasedBall = true;
                if (playersMod.ballModule) {
                    playersMod.ballModule.isBallReadyToBowl = true;
                    playersMod.ballModule.bowlingStartTime = Date.now();
                    playersMod.ballModule.idealContactTime = playersMod.ballModule.bowlingStartTime + (19.4 / playersMod.ballModule.velocity.z) * 1000;
                    playersMod.ballModule.peakSwingSpeed = 0;
                    playersMod.ballModule.peakSwingTime = 0;
                }
            }

            if (t >= 1.0) {
                playersMod.bowlerState = 'bowled';
                bowler.anims.idle.start(true, 1.0);
            }
            break;

        case 'bowled':
            playersMod.faceTarget(bowler.root, playersMod.ballModule.ballMesh.position);
            break;
    }

    if (playersMod.bowlerState === 'idle' || playersMod.bowlerState === 'waiting_runup' || playersMod.bowlerState === 'running_up' || (playersMod.bowlerState === 'bowling_delivery' && !playersMod.hasReleasedBall)) {
        const handPos = getBowlerHandPosition(playersMod);
        if (handPos && playersMod.ballModule) {
            playersMod.ballModule.position.copyFrom(handPos);
            if (playersMod.ballModule.ballMesh) {
                playersMod.ballModule.ballMesh.position.copyFrom(handPos);
            }
        }
    }
}

export function getBowlerRightArmNode(playersMod) {
    if (!playersMod.bowlerObj) return null;

    if (!playersMod.bowlerRightArmNode) {
        let foundNode = null;
        const findNode = (node) => {
            if (foundNode) return;
            const nameLower = node.name.toLowerCase();
            if (nameLower.includes("rightarm") && !nameLower.includes("forearm")) {
                foundNode = node;
                return;
            }
            node.getChildren().forEach(findNode);
        };
        findNode(playersMod.bowlerObj.root);
        playersMod.bowlerRightArmNode = foundNode;
    }
    return playersMod.bowlerRightArmNode;
}

export function getBowlerRightForeArmNode(playersMod) {
    if (!playersMod.bowlerObj) return null;

    if (!playersMod.bowlerRightForeArmNode) {
        let foundNode = null;
        const findNode = (node) => {
            if (foundNode) return;
            const nameLower = node.name.toLowerCase();
            if (nameLower.includes("rightforearm")) {
                foundNode = node;
                return;
            }
            node.getChildren().forEach(findNode);
        };
        findNode(playersMod.bowlerObj.root);
        playersMod.bowlerRightForeArmNode = foundNode;
    }
    return playersMod.bowlerRightForeArmNode;
}

export function getBowlerHandPosition(playersMod) {
    if (!playersMod.bowlerObj) return null;

    if (!playersMod.bowlerHandNode) {
        let foundNode = null;
        const findNode = (node) => {
            if (foundNode) return;
            const nameLower = node.name.toLowerCase();
            if (nameLower.includes("righthand") &&
                !nameLower.includes("index") &&
                !nameLower.includes("thumb") &&
                !nameLower.includes("ring") &&
                !nameLower.includes("middle") &&
                !nameLower.includes("pinky")) {
                foundNode = node;
                return;
            }
            node.getChildren().forEach(findNode);
        };
        findNode(playersMod.bowlerObj.root);
        playersMod.bowlerHandNode = foundNode;
    }

    if (playersMod.bowlerHandNode) {
        playersMod.bowlerHandNode.computeWorldMatrix(true);
        const localPalmOffset = new BABYLON.Vector3(-0.022, 0.05, 0.015);
        return BABYLON.Vector3.TransformCoordinates(localPalmOffset, playersMod.bowlerHandNode.getWorldMatrix());
    }

    return playersMod.bowlerObj.root.position;
}
