import { MODEL_ROTATION_X, MODEL_ROTATION_OFFSET } from './constants.js';

export function createPlayerInstance(playersMod, name, type, position, rotationY, scale) {
    const instanceId = Math.random().toString(36).substring(2, 9);
    const nameProvider = (n) => n + "_" + instanceId;

    // Instantiate meshes and skeleton
    const instance = playersMod.botContainer.instantiateModelsToScene(nameProvider, true, { doNotBindPlayPen: true });

    // Create a single parent TransformNode anchor for this player instance
    const playerAnchor = new BABYLON.TransformNode("player_" + instanceId, playersMod.scene);

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
    playerAnchor.rotation.set(MODEL_ROTATION_X, rotationY + MODEL_ROTATION_OFFSET, 0);

    if (name === "Bowler") {
        playersMod.bowlerRunStart.y = verticalOffset;
        playersMod.bowlerCrease.y = verticalOffset;

        // Temporarily assign a mock bowler object to allow bone lookup methods to find the nodes on playerAnchor
        playersMod.bowlerObj = { root: playerAnchor };

        // Cache the default bind-pose rotations of the right arm, forearm and hand
        const arm = playersMod.getBowlerRightArmNode();
        if (arm) {
            playersMod.bowlerRightArmDefaultRot = arm.rotationQuaternion ? arm.rotationQuaternion.clone() : BABYLON.Quaternion.Identity();
        }
        const foreArm = playersMod.getBowlerRightForeArmNode();
        if (foreArm) {
            playersMod.bowlerRightForeArmDefaultRot = foreArm.rotationQuaternion ? foreArm.rotationQuaternion.clone() : BABYLON.Quaternion.Identity();
        }
        playersMod.getBowlerHandPosition(); // Populates bowlerHandNode
        if (playersMod.bowlerHandNode) {
            playersMod.bowlerHandDefaultRot = playersMod.bowlerHandNode.rotationQuaternion ? playersMod.bowlerHandNode.rotationQuaternion.clone() : BABYLON.Quaternion.Identity();
        }

        // Clean up mock (setup will assign the real playerObj)
        playersMod.bowlerObj = null;
    }

    playerAnchor.getChildMeshes().forEach(mesh => {
        // Enable casting shadows for realistic presence on pitch/grass
        if (playersMod.shadowGenerator) {
            playersMod.shadowGenerator.addShadowCaster(mesh);
        }
        // Prevent frustum culling when bones animate mesh components out of bounding box
        mesh.alwaysSelectAsActiveMesh = true;
    });

    // Retarget Animations from separate animation containers to our grouped hierarchy bones
    const masterIdle = playersMod.idleContainer.animationGroups[0];
    const masterRun = playersMod.runContainer.animationGroups[0];

    const idleAnim = retargetAnimationGroup(playersMod, masterIdle, playerAnchor, instanceId);
    const runAnim = retargetAnimationGroup(playersMod, masterRun, playerAnchor, instanceId);

    // Save player state
    const playerObj = {
        name,
        type,
        root: playerAnchor,
        skeleton: instance.skeletons[0],
        anims: {
            idle: idleAnim,
            run: runAnim
        },
        startPos: playerAnchor.position.clone(),
        startRotY: rotationY,
        currentRotY: rotationY
    };

    playersMod.players.push(playerObj);

    // Start playing the idle animation by default
    idleAnim.start(true, 1.0);

    return playerObj;
}

export function retargetAnimationGroup(playersMod, sourceAnimGroup, clonedRootNode, instanceId) {
    const newGroup = new BABYLON.AnimationGroup(sourceAnimGroup.name + "_" + instanceId, playersMod.scene);

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
    for (const targetedAnim of sourceAnimGroup.targetedAnimations) {
        const sourceTarget = targetedAnim.target;
        if (!sourceTarget) continue;

        let base = sourceTarget.name;
        if (base.startsWith("mixamorig_")) {
            base = base.substring("mixamorig_".length);
        }

        let targetNode = null;
        if (nodeMap.has(base)) {
            targetNode = nodeMap.get(base);
        } else {
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
            if (prop === "scaling") continue;
            if (prop === "position") continue;

            newGroup.addTargetedAnimation(targetedAnim.animation.clone(), targetNode);
        }
    }

    return newGroup;
}
