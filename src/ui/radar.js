/**
 * LiveFieldRadar
 * Encapsulates the live top-down radar viewport, sonar sweeps,
 * and tracking markers for bowler, keeper, wickets, and ball.
 */
export default class LiveFieldRadar {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    }

    update(playersModule, ballModule) {
        if (!this.canvas || !this.ctx) {
            this.canvas = document.getElementById("radarCanvas");
            if (this.canvas) {
                this.ctx = this.canvas.getContext("2d");
            }
        }
        if (!this.canvas || !this.ctx) return;

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        const boundaryRadius = 90; // Pixels representing the boundary radius
        const actualBoundary = ballModule ? ballModule.BOUNDARY_RADIUS : 36.5;
        const scale = boundaryRadius / actualBoundary; // Scale factor (px/m)

        // Draw radar range rings
        ctx.strokeStyle = "rgba(0, 255, 0, 0.12)";
        ctx.lineWidth = 1;
        for (let r = 30; r <= 90; r += 30) {
            ctx.beginPath();
            ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Crosshairs
        ctx.strokeStyle = "rgba(0, 255, 0, 0.1)";
        ctx.beginPath();
        ctx.moveTo(centerX - 95, centerY);
        ctx.lineTo(centerX + 95, centerY);
        ctx.moveTo(centerX, centerY - 95);
        ctx.lineTo(centerX, centerY + 95);
        ctx.stroke();

        // 30-yard inner circle (27.4m)
        const innerRadius = 27.4 * scale;
        ctx.strokeStyle = "rgba(0, 255, 0, 0.25)";
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Outer boundary circle
        const boundaryCenterY = centerY + (-1.86) * scale;
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, boundaryCenterY, boundaryRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Pitch (Burlywood texture mapping) - Bowler at top, batter at bottom
        const pitchW = 3.05 * scale;
        const pitchL = 20.12 * scale;
        // Bowler end is at Z = -12.0 (top on canvas), Batter end is at Z = 8.12 (bottom on canvas)
        const pitchTopZ = -12.0;
        const pitchTop = centerY + pitchTopZ * scale;
        ctx.fillStyle = "rgba(240, 220, 180, 0.3)";
        ctx.fillRect(centerX - pitchW / 2, pitchTop, pitchW, pitchL);

        // Draw wickets (Bowler end Z = -11.92 at top, Batter end Z = 8.2 at bottom)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(centerX - 3, centerY + 8.2 * scale - 1, 6, 2);
        ctx.fillRect(centerX - 3, centerY + (-11.92) * scale - 1, 6, 2);

        // Sonar radar sweep animation
        const time = Date.now() * 0.0012;
        const sweepAngle = time % (Math.PI * 2);
        const grad = ctx.createRadialGradient(centerX, boundaryCenterY, 5, centerX, boundaryCenterY, boundaryRadius);
        grad.addColorStop(0, "rgba(0, 255, 0, 0.15)");
        grad.addColorStop(1, "rgba(0, 255, 0, 0)");
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(centerX, boundaryCenterY);
        ctx.arc(centerX, boundaryCenterY, boundaryRadius, sweepAngle - 0.25, sweepAngle, false);
        ctx.closePath();
        ctx.fill();

        // Sweep arm line
        ctx.strokeStyle = "rgba(0, 255, 0, 0.35)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(centerX, boundaryCenterY);
        ctx.lineTo(centerX + Math.cos(sweepAngle) * boundaryRadius, boundaryCenterY + Math.sin(sweepAngle) * boundaryRadius);
        ctx.stroke();

        // Draw players
        if (playersModule && playersModule.players) {
            playersModule.players.forEach(player => {
                if (!player.root) return;
                const pos = player.root.position;
                
                const pX = centerX - pos.x * scale;
                const pY = centerY + pos.z * scale;

                let dotColor = "#ffff00"; // default fielder
                let dotSize = 3.5;
                
                if (player.type === "keeper") {
                    dotColor = "#ffa500";
                    dotSize = 4.5;
                } else if (player.type === "bowler") {
                    dotColor = "#00ffff";
                    dotSize = 4.5;
                } else if (player.type === "umpire") {
                    dotColor = "#ffffff";
                    dotSize = 4.0;
                }

                // Draw player dot
                ctx.shadowBlur = 3;
                ctx.shadowColor = dotColor;
                ctx.fillStyle = dotColor;
                ctx.beginPath();
                ctx.arc(pX, pY, dotSize, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            });
        }

        // Draw ball (pulsing red dot)
        if (ballModule && ballModule.ballMesh) {
            const bPos = ballModule.ballMesh.position;
            const bX = centerX - bPos.x * scale;
            const bY = centerY + bPos.z * scale;

            const pulse = 1.5 + Math.sin(Date.now() * 0.015) * 0.7;
            
            ctx.shadowBlur = 5;
            ctx.shadowColor = "#ff3333";
            ctx.fillStyle = "#ff3333";
            ctx.beginPath();
            ctx.arc(bX, bY, 3.0 + pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }
}
