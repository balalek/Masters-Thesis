/**
 * @fileoverview Socket connection and time synchronization utilities
 * 
 * This module provides:
 * - Socket.IO connection management with singleton pattern
 * - Client-server time synchronization for event coordination
 * - Network delay compensation for accurate timing
 * - Server time calculation with offset adjustment
 * @author Bc. Martin Baláž
 * @module Utils/Socket
 */
import io from 'socket.io-client';

let socket;
let timeOffset = 0;

/**
 * Get or create the Socket.IO connection
 * 
 * Implements the singleton pattern to ensure a single shared socket
 * connection across the application. Initializes time synchronization
 * when first created.
 * 
 * @function getSocket
 * @returns {Object} The Socket.IO connection instance
 */
export const getSocket = () => {
  if (!socket) {
    socket = io(`http://${window.location.hostname}:5000`, {
      transports: ['websocket'],
      cors: { origin: "*" }
    });
    synchronizeTime();
    // Resynchronize every 5 minutes
    setInterval(synchronizeTime, 5 * 60 * 1000);
  }
  return socket;
};

/**
 * Synchronize client time with server time
 * 
 * Calculates network latency and adjusts the client's time offset
 * to match server time. Uses round-trip timing to estimate one-way
 * network delay.
 * 
 * @function synchronizeTime
 * @async
 * @returns {Promise<void>}
 */
export const synchronizeTime = async () => {
  try {
    const start = Date.now();
    const response = await fetch(`http://${window.location.hostname}:5000/server_time`);
    const data = await response.json();
    const end = Date.now();
    const networkDelay = (end - start) / 2;
    timeOffset = data.server_time - (end - networkDelay);
  } catch (error) {
    console.error('Time synchronization failed:', error);
  }
};

/**
 * Get the current server-synchronized time
 * 
 * Returns the local time adjusted with the server time offset,
 * providing a close approximation of the current server time.
 * 
 * @function getServerTime
 * @returns {number} Current time in milliseconds, adjusted to match server time
 */
export const getServerTime = () => {
  return Date.now() + timeOffset;
};