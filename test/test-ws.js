import { io } from 'socket.io-client';

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InRodWFuaGFpQGdtYWlsLmNvbSIsInVzZXJJZCI6IjU3MzJiZTI5LTI2OGYtNGY2Yi05NzM0LWFlMzBiYmFhMDA0YiIsIm5hbWUiOiJoYWkiLCJpYXQiOjE3NjE2NzAyMTAsImV4cCI6MTc2MTY3MTExMH0.u1q2g2iPMjzY25DII543xJ4ZvrxFcmfcTA-XZwMdrgQ';
const socket = io('http://localhost:3001', {
  path: '/ws', // match với path server
  query: { token }, // gửi token như em làm
  transports: ['websocket'], // dùng WS luôn, không fallback polling
});

socket.on('connect', () => {
  console.log('✅ Connected with id:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected');
});

socket.onAny((event, data) => {
  console.log('📩 Received:', event, data);
});
