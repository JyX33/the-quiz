import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('token'),
  },
});

// Heartbeat mechanism
setInterval(() => {
  socket.emit('heartbeat');
}, 5000); // Emit heartbeat every 5 seconds

export default socket;
