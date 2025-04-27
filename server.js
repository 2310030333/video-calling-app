// server.js
 const express = require('express');
 const http = require('http');
 const { Server } = require('socket.io');
 const socketIo = require('socket.io');
 const path = require('path');
 
 const app = express();
 const server = http.createServer(app);
 const io = new Server(server);
 const io = socketIo(server);
 
 // Serve static files from 'public' folder
 app.use(express.static(path.join(__dirname, 'public')));
 
 io.on('connection', (socket) => {
     console.log('A user connected:', socket.id);
     console.log('A user connected');
 
     socket.on('join', (room) => {
         socket.join(room);
         console.log(`User ${socket.id} joined room ${room}`);
     socket.on('disconnect', () => {
         console.log('User disconnected');
     });
 
     socket.on('offer', (data) => {
         socket.to(data.room).emit('offer', data.offer);
     socket.on('offer', (offer) => {
         socket.broadcast.emit('offer', offer);
     });
 
     socket.on('answer', (data) => {
         socket.to(data.room).emit('answer', data.answer);
     socket.on('answer', (answer) => {
         socket.broadcast.emit('answer', answer);
     });
 
     socket.on('candidate', (data) => {
         socket.to(data.room).emit('candidate', data.candidate);
     });
 
     socket.on('disconnect', () => {
         console.log('A user disconnected:', socket.id);
     socket.on('candidate', (candidate) => {
         socket.broadcast.emit('candidate', candidate);
     });
 });
 
 const PORT = process.env.PORT || 3000;
 server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
 server.listen(PORT, () => {
     console.log(`Server is running on port ${PORT}`);
 });
