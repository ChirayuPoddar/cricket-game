export function createDOMElements(ui, onToggleMode) {
    // 1. Create a container for the persistent Scoreboard
    ui.scoreContainer = document.createElement("div");
    ui.scoreContainer.style.position = "absolute";
    ui.scoreContainer.style.top = "20px";
    ui.scoreContainer.style.left = "20px";
    ui.scoreContainer.style.padding = "15px 25px";
    ui.scoreContainer.style.background = "rgba(10, 20, 40, 0.95)";
    ui.scoreContainer.style.color = "#ffffff";
    ui.scoreContainer.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    ui.scoreContainer.style.fontSize = "24px";
    ui.scoreContainer.style.fontWeight = "bold";
    ui.scoreContainer.style.borderRadius = "8px";
    ui.scoreContainer.style.borderLeft = "6px solid #00ff00";
    ui.scoreContainer.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
    ui.scoreContainer.style.pointerEvents = "none";
    ui.scoreContainer.style.zIndex = "1000";
    document.body.appendChild(ui.scoreContainer);

    // 2. Create a stats container (runs by type)
    ui.statsContainer = document.createElement("div");
    ui.statsContainer.style.position = "absolute";
    ui.statsContainer.style.bottom = "20px";
    ui.statsContainer.style.left = "20px";
    ui.statsContainer.style.padding = "15px 25px";
    ui.statsContainer.style.background = "rgba(10, 20, 40, 0.95)";
    ui.statsContainer.style.color = "#ffffff";
    ui.statsContainer.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    ui.statsContainer.style.fontSize = "14px";
    ui.statsContainer.style.borderRadius = "8px";
    ui.statsContainer.style.borderLeft = "6px solid #FFD700";
    ui.statsContainer.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
    ui.statsContainer.style.pointerEvents = "none";
    ui.statsContainer.style.zIndex = "1000";
    document.body.appendChild(ui.statsContainer);

    // 3. Create a hidden center overlay container for major announcements
    ui.alertContainer = document.createElement("div");
    ui.alertContainer.style.position = "absolute";
    ui.alertContainer.style.top = "30%";
    ui.alertContainer.style.left = "50%";
    ui.alertContainer.style.transform = "translate(-50%, -50%)";
    ui.alertContainer.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    ui.alertContainer.style.fontSize = "64px";
    ui.alertContainer.style.fontWeight = "900";
    ui.alertContainer.style.textAlign = "center";
    ui.alertContainer.style.textShadow = "0 0 20px rgba(0,0,0,0.6)";
    ui.alertContainer.style.opacity = "0";
    ui.alertContainer.style.transition = "opacity 0.2s ease-in-out, transform 0.2s ease-in-out";
    ui.alertContainer.style.pointerEvents = "none";
    ui.alertContainer.style.zIndex = "1001";
    document.body.appendChild(ui.alertContainer);

    // Style helper for fade-in animation
    const style = document.createElement("style");
    style.innerHTML = `
        @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1.0); }
        }
    `;
    document.head.appendChild(style);

    // Over summary overlay container
    ui.overSummaryContainer = document.createElement("div");
    ui.overSummaryContainer.id = "overSummaryModal";
    ui.overSummaryContainer.style.position = "absolute";
    ui.overSummaryContainer.style.top = "0";
    ui.overSummaryContainer.style.left = "0";
    ui.overSummaryContainer.style.width = "100%";
    ui.overSummaryContainer.style.height = "100%";
    ui.overSummaryContainer.style.background = "rgba(5, 10, 25, 0.88)";
    ui.overSummaryContainer.style.backdropFilter = "blur(8px)";
    ui.overSummaryContainer.style.display = "none";
    ui.overSummaryContainer.style.justifyContent = "center";
    ui.overSummaryContainer.style.alignItems = "center";
    ui.overSummaryContainer.style.zIndex = "2000";
    document.body.appendChild(ui.overSummaryContainer);

    // 4. Create the Timing Meter fullscreen overlay modal
    ui.timingMeterContainer = document.createElement("div");
    ui.timingMeterContainer.id = "timingMeterContainer";
    ui.timingMeterContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(5, 10, 25, 0.6);
        backdrop-filter: blur(5px);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 1999;
        pointer-events: none;
        user-select: none;
    `;
    document.body.appendChild(ui.timingMeterContainer);
}
