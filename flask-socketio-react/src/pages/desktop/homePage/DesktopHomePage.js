// src/components/desktop/DesktopHomePage.js
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

let socket;

const getSocket = () => {
  if (!socket) {
    socket = io(`http://${window.location.hostname}:5000`, {
      transports: ['websocket'],
      cors: { origin: "*" }
    });
  }
  return socket;
};

const DesktopHomePage = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('receive_message', (data) => {
      setMessages((prevMessages) => [...prevMessages, data]);
    });

    return () => {
      socket.off('connect');
      socket.off('receive_message');
    };
  }, []);

  const sendMessage = () => {
    const socket = getSocket();
    socket.emit('send_message', message);
    setMessage('');
  };

  return (
    <div>
      <h1>Quiz Room</h1>
      <p>For mobile users join at: http://{window.location.hostname}:5000/play</p>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Enter a message"
      />
      <button onClick={sendMessage}>Send</button>
      <div>
        {messages.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
      </div>
    </div>
  );
};

export default DesktopHomePage;