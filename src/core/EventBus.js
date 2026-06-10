/**
 * EventBus - Central event management system
 * Enables event-driven architecture without tight coupling
 * 
 * Usage:
 *   EventBus.on('ball.struck', (data) => { console.log('Shot played!', data) })
 *   EventBus.emit('ball.struck', { type: 'DRIVE', power: 85 })
 *   EventBus.off('ball.struck', callback)
 */

export default class EventBus {
  static #subscribers = {}; // { eventName: [callback1, callback2, ...] }
  static #eventHistory = [];
  static #maxHistorySize = 1000;
  static #isDebugMode = false;

  // Predefined game event name constants for type-safe access via EventBus.GAME_EVENTS.*
  static GAME_EVENTS = {
    SHOT_PLAYED:    'shot.played',
    BOUNDARY_FOUR:  'boundary.four',
    BOUNDARY_SIX:   'boundary.six',
    RUNS_SCORED:    'run.scored',
    WICKET_DOWN:    'wicket.down',
    BALL_STRUCK:    'ball.struck',
    BALL_WICKET:    'ball.wicket',
    BALL_BOUNDARY:  'ball.boundary',
    BALL_RESET:     'ball.reset',
    SHOT_TIMED:     'shot.timed',
    SHOT_PERFECT:   'shot.perfect',
    GAME_PAUSED:    'game.paused',
    GAME_RESUMED:   'game.resumed',
    GAME_OVER:      'game.over',
    DELIVERY_START: 'delivery.start',
    OVER_COMPLETE:  'over.complete',
    UI_UPDATE:      'ui.update',
    UI_ANNOUNCEMENT:'ui.announcement',
    UI_REPLAY:      'ui.replay',
    CAMERA_FOLLOW:  'camera.follow',
    CAMERA_RESET:   'camera.reset',
    AUDIO_PLAY:     'audio.play',
    AUDIO_COMMENTARY:'audio.commentary',
    ANALYTICS_SESSION: 'analytics.session',
    ANALYTICS_DELIVERY:'analytics.delivery',
  };

  /**
   * Subscribe to an event
   * @param {string} eventName - Name of event to listen for
   * @param {Function} callback - Function to call when event fires
   * @returns {Function} Unsubscribe function
   */
  static on(eventName, callback) {
    if (typeof eventName !== 'string' || typeof callback !== 'function') {
      console.error('EventBus.on requires (string, function)');
      return () => {};
    }

    if (!this.#subscribers[eventName]) {
      this.#subscribers[eventName] = [];
    }

    this.#subscribers[eventName].push(callback);

    if (this.#isDebugMode) {
      console.log(`✓ Subscribed to event: "${eventName}"`);
    }

    // Return unsubscribe function
    return () => this.off(eventName, callback);
  }

  /**
   * Subscribe to event, but only trigger once
   * @param {string} eventName - Name of event
   * @param {Function} callback - Function to call once
   * @returns {Function} Unsubscribe function
   */
  static once(eventName, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(eventName, wrapper); // Auto-unsubscribe after first call
    };

    return this.on(eventName, wrapper);
  }

  /**
   * Emit an event, calling all subscribers
   * @param {string} eventName - Name of event to emit
   * @param {*} data - Data to pass to subscribers
   * @returns {number} Number of subscribers notified
   */
  static emit(eventName, data = null) {
    if (typeof eventName !== 'string') {
      console.error('EventBus.emit requires string eventName');
      return 0;
    }

    // Record event in history
    this.#addToHistory(eventName, data);

    const callbacks = this.#subscribers[eventName] || [];
    let notifiedCount = 0;

    for (const callback of callbacks) {
      try {
        callback(data);
        notifiedCount++;
      } catch (error) {
        console.error(`Error in event listener for "${eventName}":`, error);
      }
    }

    if (this.#isDebugMode && notifiedCount > 0) {
      console.log(`↳ Event emitted: "${eventName}" → ${notifiedCount} listeners`, data);
    }

    return notifiedCount;
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Name of event
   * @param {Function} callback - Specific callback to remove
   * @returns {boolean} True if callback was found and removed
   */
  static off(eventName, callback) {
    if (!this.#subscribers[eventName]) {
      return false;
    }

    const index = this.#subscribers[eventName].indexOf(callback);
    if (index > -1) {
      this.#subscribers[eventName].splice(index, 1);
      
      if (this.#isDebugMode) {
        console.log(`✗ Unsubscribed from event: "${eventName}"`);
      }
      
      return true;
    }

    return false;
  }

  /**
   * Remove all subscribers from an event
   * @param {string} eventName - Name of event
   */
  static offAll(eventName) {
    if (this.#subscribers[eventName]) {
      const count = this.#subscribers[eventName].length;
      delete this.#subscribers[eventName];
      
      if (this.#isDebugMode) {
        console.log(`✗ Removed all (${count}) subscribers from: "${eventName}"`);
      }
    }
  }

  /**
   * Get list of all subscribed events
   * @returns {string[]} Array of event names
   */
  static getEventNames() {
    return Object.keys(this.#subscribers).filter(
      name => this.#subscribers[name].length > 0
    );
  }

  /**
   * Get number of subscribers for an event
   * @param {string} eventName - Name of event
   * @returns {number} Subscriber count
   */
  static getSubscriberCount(eventName) {
    return this.#subscribers[eventName]?.length || 0;
  }

  /**
   * Get all subscribers for an event
   * @param {string} eventName - Name of event
   * @returns {Function[]} Array of callbacks
   */
  static getSubscribers(eventName) {
    return this.#subscribers[eventName]?.slice() || [];
  }

  /**
   * Get event history
   * @returns {object[]} Array of recent events
   */
  static getHistory() {
    return this.#eventHistory.slice();
  }

  /**
   * Clear event history
   */
  static clearHistory() {
    this.#eventHistory = [];
  }

  /**
   * Add event to history
   * @private
   */
  static #addToHistory(eventName, data) {
    this.#eventHistory.push({
      timestamp: Date.now(),
      event: eventName,
      data: data,
      listenerCount: this.#subscribers[eventName]?.length || 0
    });

    // Trim history if too large
    if (this.#eventHistory.length > this.#maxHistorySize) {
      this.#eventHistory.shift();
    }
  }

  /**
   * Enable/disable debug logging
   * @param {boolean} enabled - True to enable debug mode
   */
  static setDebugMode(enabled) {
    this.#isDebugMode = enabled;
    if (enabled) {
      console.log('📡 EventBus debug mode ENABLED');
    }
  }

  /**
   * Get debug status
   * @returns {boolean} True if debug mode is enabled
   */
  static isDebugMode() {
    return this.#isDebugMode;
  }

  /**
   * Print EventBus statistics to console
   */
  static printStats() {
    const events = this.getEventNames();
    console.group('📊 EventBus Statistics');
    console.log(`Total unique events: ${events.length}`);
    console.log(`Total event history: ${this.#eventHistory.length}`);
    
    const sortedEvents = events.sort((a, b) => 
      this.getSubscriberCount(b) - this.getSubscriberCount(a)
    );
    
    console.log('Events by subscriber count:');
    for (const event of sortedEvents) {
      const count = this.getSubscriberCount(event);
      console.log(`  "${event}": ${count} subscriber${count !== 1 ? 's' : ''}`);
    }
    
    console.groupEnd();
  }

  /**
   * Clear all subscriptions (nuclear option)
   */
  static clear() {
    this.#subscribers = {};
    console.warn('⚠️  EventBus cleared - all subscriptions removed');
  }
}

// Predefined game events (reference list for consistency)
export const GAME_EVENTS = {
  // Ball events
  'ball.struck': 'Ball hit by player',
  'ball.wicket': 'Ball hit stumps/wicket',
  'ball.boundary': 'Ball reached boundary',
  'ball.reset': 'Ball reset for new delivery',

  // Shot events
  'shot.played': 'Shot type identified',
  'shot.timed': 'Shot timing calculated',
  'shot.perfect': 'Perfect shot (timing + placement)',

  // Score events
  'run.scored': 'Run scored',
  'boundary.four': 'Four runs scored',
  'boundary.six': 'Six runs scored',
  'wicket.down': 'Player wicket',

  // Game state events
  'game.paused': 'Game paused',
  'game.resumed': 'Game resumed',
  'game.over': 'Game ended',
  'delivery.start': 'New delivery started',
  'over.complete': 'Over completed',

  // UI events
  'ui.update': 'UI needs update',
  'ui.announcement': 'Show announcement',
  'ui.replay': 'Show replay',

  // Camera events
  'camera.follow': 'Camera should follow ball',
  'camera.reset': 'Camera reset to normal',

  // Audio events
  'audio.play': 'Play sound effect',
  'audio.commentary': 'Play commentary',

  // Analytics events
  'analytics.session': 'Session event recorded',
  'analytics.delivery': 'Delivery data recorded'
};
