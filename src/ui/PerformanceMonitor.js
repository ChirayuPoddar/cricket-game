/**
 * PerformanceMonitor - Real-time performance metrics overlay
 * Displays FPS, input latency, memory usage, and game statistics
 * 
 * Toggle with Ctrl+P
 * 
 * Usage:
 *   const monitor = new PerformanceMonitor()
 *   monitor.start()
 *   // Updates automatically in game loop
 *   monitor.stop()
 */

export default class PerformanceMonitor {
  constructor() {
    this.enabled = false;
    this.overlayElement = null;
    this.frameCount = 0;
    this.lastFrameTime = Date.now();
    this.fps = 60;
    this.frameTimeMs = 16.67;
    
    // Input latency tracking
    this.inputLatencies = [];
    this.maxLatencySamples = 60; // Track last 60 frames
    this.averageLatency = 0;
    
    // Memory tracking
    this.memoryHistory = [];
    this.maxMemorySamples = 30;
    
    // Game stats tracking
    this.stats = {
      deliveries: 0,
      runs: 0,
      wickets: 0,
      boundaries: 0,
      shotTypes: {}
    };
    
    this.setupEventListeners();
  }

  /**
   * Initialize performance monitor
   * Called once during game setup
   */
  initialize() {
    this.createOverlay();
    this.setupKeyboardToggle();
    // console.log('✓ PerformanceMonitor initialized (Press Ctrl+P to toggle)');
  }

  /**
   * Create the overlay HTML element
   * @private
   */
  createOverlay() {
    this.overlayElement = document.createElement('div');
    this.overlayElement.id = 'performance-monitor';
    this.overlayElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.85);
      color: #00FF00;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      padding: 12px 15px;
      border-radius: 6px;
      border: 1px solid #00FF00;
      z-index: 10000;
      line-height: 1.6;
      display: none;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
      pointer-events: none;
      user-select: none;
      min-width: 200px;
    `;
    
    document.body.appendChild(this.overlayElement);
  }

  /**
   * Setup keyboard shortcut (Ctrl+P)
   * @private
   */
  setupKeyboardToggle() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  /**
   * Setup event listeners for game events
   * @private
   */
  setupEventListeners() {
    // Listen for game events to track stats
    // These will be integrated with EventBus once it's integrated into main game
    if (window.PerformanceMonitorEvents) {
      window.PerformanceMonitorEvents.on?.('delivery.start', () => {
        this.stats.deliveries++;
      });
      
      window.PerformanceMonitorEvents.on?.('run.scored', () => {
        this.stats.runs++;
      });
      
      window.PerformanceMonitorEvents.on?.('wicket.down', () => {
        this.stats.wickets++;
      });
    }
  }

  /**
   * Start performance monitoring
   */
  start() {
    this.enabled = true;
    this.lastFrameTime = Date.now();
    // console.log('✓ PerformanceMonitor started');
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    this.enabled = false;
    // console.log('✗ PerformanceMonitor stopped');
  }

  /**
   * Toggle visibility
   */
  toggle() {
    if (this.overlayElement) {
      const isVisible = this.overlayElement.style.display !== 'none';
      this.overlayElement.style.display = isVisible ? 'none' : 'block';
      // console.log(`Performance Monitor ${isVisible ? 'hidden' : 'shown'} (Ctrl+P)`);
    }
  }

  /**
   * Update metrics (call once per frame)
   * @param {object} gameState - Current game state (optional)
   */
  update(gameState = null) {
    if (!this.enabled) return;

    const now = Date.now();
    this.frameCount++;

    // Calculate FPS every 0.5 seconds
    if (now - this.lastFrameTime >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFrameTime));
      this.frameTimeMs = 1000 / this.fps;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    // Update memory usage if available
    if (performance.memory) {
      const usedMB = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
      this.memoryHistory.push(usedMB);
      if (this.memoryHistory.length > this.maxMemorySamples) {
        this.memoryHistory.shift();
      }
    }

    // Update display
    this.render();
  }

  /**
   * Record input latency measurement
   * @param {number} latencyMs - Latency in milliseconds
   */
  recordLatency(latencyMs) {
    this.inputLatencies.push(latencyMs);
    if (this.inputLatencies.length > this.maxLatencySamples) {
      this.inputLatencies.shift();
    }

    // Calculate average
    this.averageLatency = 
      this.inputLatencies.reduce((a, b) => a + b, 0) / this.inputLatencies.length;
  }

  /**
   * Render overlay to screen
   * @private
   */
  render() {
    if (!this.overlayElement || this.overlayElement.style.display === 'none') {
      return;
    }

    let html = '<div style="font-weight: bold; margin-bottom: 8px; color: #00FF00;">📊 Performance</div>';

    // FPS section
    const fpsColor = this.fps >= 55 ? '#00FF00' : this.fps >= 45 ? '#FFFF00' : '#FF4444';
    html += `<div style="color: ${fpsColor};">FPS: <span style="font-weight: bold;">${this.fps}</span></div>`;
    html += `<div style="font-size: 10px; color: #888888;">Frame: ${this.frameTimeMs.toFixed(2)}ms</div>`;

    // Latency section
    const latencyColor = this.averageLatency <= 60 ? '#00FF00' : this.averageLatency <= 100 ? '#FFFF00' : '#FF4444';
    html += `<div style="margin-top: 6px; border-top: 1px solid #444; padding-top: 6px;">`;
    html += `<div style="color: ${latencyColor};">Latency: <span style="font-weight: bold;">${this.averageLatency.toFixed(0)}ms</span></div>`;
    if (this.inputLatencies.length > 0) {
      const maxLatency = Math.max(...this.inputLatencies);
      html += `<div style="font-size: 10px; color: #888888;">Peak: ${maxLatency.toFixed(0)}ms</div>`;
    }
    html += '</div>';

    // Memory section
    if (performance.memory) {
      const usedMB = (performance.memory.usedJSHeapSize / 1048576).toFixed(1);
      const totalMB = (performance.memory.jsHeapSizeLimit / 1048576).toFixed(1);
      const percentUsed = ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(0);
      
      const memoryColor = percentUsed < 50 ? '#00FF00' : percentUsed < 75 ? '#FFFF00' : '#FF4444';
      html += `<div style="margin-top: 6px; border-top: 1px solid #444; padding-top: 6px;">`;
      html += `<div style="color: ${memoryColor};">Memory: <span style="font-weight: bold;">${usedMB}MB</span></div>`;
      html += `<div style="font-size: 10px; color: #888888;">Total: ${totalMB}MB (${percentUsed}%)</div>`;
      html += '</div>';
    }

    // Game stats section
    if (this.stats.deliveries > 0) {
      html += `<div style="margin-top: 6px; border-top: 1px solid #444; padding-top: 6px; font-size: 10px;">`;
      html += `<div>⚾ Deliveries: ${this.stats.deliveries}</div>`;
      html += `<div>🏃 Runs: ${this.stats.runs}</div>`;
      html += `<div>💀 Wickets: ${this.stats.wickets}</div>`;
      html += '</div>';
    }

    // Status indicators
    html += `<div style="margin-top: 6px; border-top: 1px solid #444; padding-top: 6px; font-size: 9px;">`;
    html += `<div>${this.getStatusIndicator()}</div>`;
    html += '</div>';

    this.overlayElement.innerHTML = html;
  }

  /**
   * Get status indicator based on metrics
   * @private
   */
  getStatusIndicator() {
    let status = '🟢 Excellent';
    
    if (this.fps < 55 || this.averageLatency > 100) {
      status = '🟡 Good';
    }
    
    if (this.fps < 45 || this.averageLatency > 150) {
      status = '🟠 Warning';
    }
    
    if (this.fps < 30 || this.averageLatency > 200) {
      status = '🔴 Poor';
    }

    return status;
  }

  /**
   * Get formatted statistics report
   * @returns {string} Formatted stats
   */
  getReport() {
    const avgLatency = this.averageLatency.toFixed(0);
    const maxLatency = this.inputLatencies.length > 0 ? 
      Math.max(...this.inputLatencies).toFixed(0) : 'N/A';
    const minLatency = this.inputLatencies.length > 0 ? 
      Math.min(...this.inputLatencies).toFixed(0) : 'N/A';

    return `
PERFORMANCE REPORT
==================
FPS: ${this.fps}
Frame Time: ${this.frameTimeMs.toFixed(2)}ms

Input Latency:
  Average: ${avgLatency}ms
  Max: ${maxLatency}ms
  Min: ${minLatency}ms

${performance.memory ? `Memory:
  Used: ${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)}MB
  Total: ${(performance.memory.jsHeapSizeLimit / 1048576).toFixed(1)}MB
` : ''}
Game Stats:
  Deliveries: ${this.stats.deliveries}
  Runs: ${this.stats.runs}
  Wickets: ${this.stats.wickets}

Status: ${this.getStatusIndicator()}
    `.trim();
  }

  /**
   * Print report to console
   */
  printReport() {
    console.log(this.getReport());
  }

  /**
   * Reset all statistics
   */
  reset() {
    this.frameCount = 0;
    this.fps = 60;
    this.inputLatencies = [];
    this.averageLatency = 0;
    this.memoryHistory = [];
    this.stats = {
      deliveries: 0,
      runs: 0,
      wickets: 0,
      boundaries: 0,
      shotTypes: {}
    };
    // console.log('✓ PerformanceMonitor reset');
  }

  /**
   * Get performance grade
   * @returns {string} A-F grade
   */
  getGrade() {
    const fpsScore = this.fps / 60;
    const latencyScore = Math.max(0, 1 - (this.averageLatency / 200));
    const overallScore = (fpsScore + latencyScore) / 2;

    if (overallScore >= 0.95) return 'A+';
    if (overallScore >= 0.90) return 'A';
    if (overallScore >= 0.80) return 'B';
    if (overallScore >= 0.70) return 'C';
    if (overallScore >= 0.60) return 'D';
    return 'F';
  }
}

// Export for use in game
export { PerformanceMonitor };
