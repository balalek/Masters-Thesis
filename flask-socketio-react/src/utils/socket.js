import io from 'socket.io-client';

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(`http://${window.location.hostname}:5000`, {
      transports: ['websocket'],
      cors: { origin: "*" }
    });
  }
  return socket;
};
