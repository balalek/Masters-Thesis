import io from 'socket.io-client';

let socket;
let timeOffset = 0;

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

export const getServerTime = () => {
  return Date.now() + timeOffset;
};
