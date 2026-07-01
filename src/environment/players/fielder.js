import EventBus from '../../core/EventBus.js';

export function updateFieldersLogic(playersMod, deltaTime) {
    if (!playersMod.ballModule || !playersMod.ballModule.ballMesh) return;

    const ballPos = playersMod.ballModule.ballMesh.position;

    if (playersMod.isBallInPlay && !playersMod.hasFielderFielded) {
        // Evaluate chasers dynamically
        const fieldersWithDist = playersMod.players
            .filter(p => {
                if (p.type === 'fielder') return true;
                if (p.type === 'keeper') return true;
                if (p.type === 'bowler') {
                    return playersMod.bowlerState !== 'running_up' && playersMod.bowlerState !== 'bowling_delivery';
                }
                return false;
            })
            .map(p => ({ player: p, dist: BABYLON.Vector3.Distance(p.root.position, ballPos) }))
            .sort((a, b) => a.dist - b.dist);

        let newChasers = [];
        if (fieldersWithDist.length > 0) {
            const minDist = fieldersWithDist[0].dist;
            newChasers.push(fieldersWithDist[0].player);

            // Equidistant chasers within 1.5m threshold
            if (fieldersWithDist.length > 1 && (fieldersWithDist[1].dist - minDist) <= 1.5) {
                newChasers.push(fieldersWithDist[1].player);
            }
        }

        // Sync chaser animations
        playersMod.activeChasers.forEach(oldChaser => {
            if (!newChasers.includes(oldChaser)) {
                oldChaser.anims.run.stop();
                oldChaser.anims.idle.start(true, 1.0);
            }
        });

        newChasers.forEach(newChaser => {
            if (!playersMod.activeChasers.includes(newChaser)) {
                newChaser.anims.idle.stop();
                newChaser.anims.run.start(true, 1.15);
            }
        });

        playersMod.activeChasers = newChasers;

        // Move active chasers towards the ball
        let ballReached = false;
        playersMod.activeChasers.forEach(chaser => {
            const chaserRoot = chaser.root;
            const targetSpot = new BABYLON.Vector3(ballPos.x, chaserRoot.position.y, ballPos.z);
            const toBall = targetSpot.subtract(chaserRoot.position);
            const distance = toBall.length();

            faceTarget(playersMod, chaserRoot, targetSpot);

            if (distance > 0.8) {
                const moveDir = toBall.normalize();
                chaserRoot.position.addInPlace(moveDir.scale(playersMod.chaseSpeed * deltaTime));
            } else {
                ballReached = true;
            }
        });

        if (ballReached) {
            playersMod.hasFielderFielded = true;

            playersMod.activeChasers.forEach(chaser => {
                chaser.anims.run.stop();
                chaser.anims.idle.start(true, 1.0);
            });
            playersMod.activeChasers = [];

            // Stop ball physics
            playersMod.ballModule.velocity.set(0, 0, 0);
            playersMod.ballModule.position.y = playersMod.ballModule.BALL_DIAMETER / 2;

            if (playersMod.ballModule.uiModule) {
                playersMod.ballModule.uiModule.showAnnouncement("FIELDED! 🖐️", "#00FFFF");
            }
        }

        // Make non-chasers face the ball
        playersMod.players.forEach(player => {
            if (playersMod.activeChasers.includes(player)) return;
            faceTarget(playersMod, player.root, ballPos);
        });

        // Check for Catch Dismissal
        if (!playersMod.ballModule.hasHitGroundAfterStroke && ballPos.y > 0.1 && ballPos.y < 2.0) {
            playersMod.players.forEach(player => {
                if (player.type === 'bowler' && (playersMod.bowlerState === 'running_up' || playersMod.bowlerState === 'bowling_delivery')) {
                    return;
                }
                if (playersMod.hasFielderFielded) return;

                const distXZ = BABYLON.Vector2.Distance(
                    new BABYLON.Vector2(player.root.position.x, player.root.position.z),
                    new BABYLON.Vector2(ballPos.x, ballPos.z)
                );

                const isWithinReachHeight = ballPos.y >= 0.2 && ballPos.y <= 2.2;

                if (distXZ < 0.95 && isWithinReachHeight) {
                    playersMod.hasFielderFielded = true;

                    playersMod.activeChasers.forEach(chaser => {
                        chaser.anims.run.stop();
                        chaser.anims.idle.start(true, 1.0);
                    });
                    playersMod.activeChasers = [];

                    player.anims.run.stop();
                    player.anims.idle.start(true, 1.0);

                    playersMod.ballModule.velocity.set(0, 0, 0);
                    playersMod.ballModule.hasHitHandOrStumps = true;

                    EventBus.emit(EventBus.GAME_EVENTS.WICKET_DOWN, {
                        dismissalType: 'caught',
                        position: ballPos.clone()
                    });

                    if (playersMod.ballModule.uiModule) {
                        playersMod.ballModule.uiModule.registerWicket();
                        const { timingDiff, timingText, noSwing } = playersMod.ballModule.getTimingData();
                        playersMod.ballModule.uiModule.showTimingMeter(timingDiff, timingText, noSwing, "CAUGHT OUT! 🖐️🛑", "#FF3333");
                    }

                    setTimeout(() => { playersMod.ballModule.resetDelivery(true); }, 2000);
                }
            });
        }
    } else {
        const targetPos = new BABYLON.Vector3(0, 0, 7.4);
        playersMod.players.forEach(player => {
            if (player.type === 'bowler' && playersMod.bowlerState === 'running_up') return;
            faceTarget(playersMod, player.root, targetPos);
        });
    }
}

export function faceTarget(playersMod, mesh, targetPos) {
    const dx = targetPos.x - mesh.position.x;
    const dz = targetPos.z - mesh.position.z;
    const angle = Math.atan2(dx, dz);
    mesh.rotation.y = angle + playersMod.MODEL_ROTATION_OFFSET;
}
