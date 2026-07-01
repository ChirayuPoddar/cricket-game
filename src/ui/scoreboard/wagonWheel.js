export function drawWagonWheel(outcomeColor, contactPos, finalPos) {
    const canvas = document.getElementById("wagonWheelCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = w / 2 - 8;

    ctx.clearRect(0, 0, w, h);

    // 1. Draw outer boundary circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(0, 255, 200, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Draw 30-yard inner circle (dashed)
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.6, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dashed lines

    // 3. Draw 45-degree sector dividers (dashed)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 8]);
    for (let angleDeg = 0; angleDeg < 360; angleDeg += 45) {
        const rad = angleDeg * Math.PI / 180;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
        ctx.stroke();
    }
    ctx.setLineDash([]); // Reset dashed lines

    // 4. Draw pitch rectangle in the center
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(cx - 4, cy - 30, 8, 60);

    // 5. Draw stumps/wickets icons at batsman and bowler crease
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;

    // Batsman crease wickets (downside)
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy + 30); ctx.lineTo(cx - 3, cy + 24);
    ctx.moveTo(cx, cy + 30); ctx.lineTo(cx, cy + 24);
    ctx.moveTo(cx + 3, cy + 30); ctx.lineTo(cx + 3, cy + 24);
    ctx.moveTo(cx - 4, cy + 24); ctx.lineTo(cx + 4, cy + 24);
    ctx.stroke();

    // Bowler crease wickets (topside)
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - 30); ctx.lineTo(cx - 3, cy - 24);
    ctx.moveTo(cx, cy - 30); ctx.lineTo(cx, cy - 24);
    ctx.moveTo(cx + 3, cy - 30); ctx.lineTo(cx + 3, cy - 24);
    ctx.moveTo(cx - 4, cy - 24); ctx.lineTo(cx + 4, cy - 24);
    ctx.stroke();

    // 6. Draw batsman spot in center
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // 7. Direction and boundary texts (left = LEG, right = OFF, top = BOWLER, bottom = WICKETS)
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "bold 9px 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Sides
    ctx.fillText("LEG SIDE", cx - 95, cy);
    ctx.fillText("OFF SIDE", cx + 95, cy);

    // Ends
    ctx.fillText("BOWLER", cx, cy - r + 15);
    ctx.fillText("WICKETS", cx, cy + r - 15);

    // 8. Calculate path line (invert dx to mirror X-axis to screen space)
    const dx = -(finalPos.x - contactPos.x);
    const dz = finalPos.z - contactPos.z;
    const maxLen = 40; // boundary radius
    const len = Math.sqrt(dx * dx + dz * dz);
    const scale = Math.min(1.0, len / maxLen) * r;

    const angle = Math.atan2(-dz, dx); // -dz so Z goes forward (UP on canvas)
    const targetX = cx + Math.cos(angle) * scale;
    const targetY = cy - Math.sin(angle) * scale;

    // 9. Draw path line (glowing shot line)
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(targetX, targetY);
    ctx.strokeStyle = outcomeColor;
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.shadowColor = outcomeColor;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow

    // 10. Draw endpoint dot & glowing ripple circle
    ctx.beginPath();
    ctx.arc(targetX, targetY, 6, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(targetX, targetY, 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
}
