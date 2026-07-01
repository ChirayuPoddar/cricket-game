export const TIMING_COLUMNS_COUNT = 21;

export function getTimingLabelStyles(timingText) {
    let labelBgColor = "rgba(80, 80, 80, 0.9)";
    let labelTextColor = "#ffffff";
    
    if (timingText === "PERFECT") {
        labelBgColor = "rgba(0, 245, 212, 0.95)";
        labelTextColor = "#000000";
    } else if (timingText === "GOOD") {
        labelBgColor = "rgba(155, 93, 229, 0.95)";
    } else if (["EARLY", "LATE", "TOO EARLY", "TOO LATE"].includes(timingText)) {
        labelBgColor = "rgba(255, 0, 127, 0.95)";
    }
    
    return { labelBgColor, labelTextColor };
}
