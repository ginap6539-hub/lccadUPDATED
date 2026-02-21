import { io } from 'socket.io-client';

const socket = io(window.location.origin);

export const subscribeToAdminNotifications = (callback: (data: any) => void) => {
  socket.on('admin-notification', callback);
  return () => socket.off('admin-notification', callback);
};

export const subscribeToPosts = (callback: (post: any) => void) => {
  socket.on('new-post', callback);
  return () => socket.off('new-post', callback);
};

export const subscribeToMessages = (callback: (msg: any) => void) => {
  socket.on('broadcast-message', callback);
  socket.on('private-message', callback);
  return () => {
    socket.off('broadcast-message', callback);
    socket.off('private-message', callback);
  };
};

export const joinUserRoom = (userId: number) => {
  socket.emit('join', userId);
};

export default socket;
