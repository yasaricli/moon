import { io } from "socket.io-client";

let socket;

// tek bir socket.io bağlantısı, ilk kullanımda açılır
export const getSocket = () => {
  socket ||= io();
  return socket;
};
