const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join', (room) => {
        console.log(`User ${socket.id} joined room: ${room}`);
        socket.join(room);

        const clients = io.sockets.adapter.rooms.get(room);
        if (clients && clients.size > 1) {
            socket.to(room).emit('other-user-joined');
        }

        socket.emit('joined');
    });

    socket.on('offer', (offer, room) => {
        console.log(`Offer from ${socket.id} to room ${room}`);
        socket.to(room).emit('offer', offer);
    });

    socket.on('answer', (answer, room) => {
        console.log(`Answer from ${socket.id} to room ${room}`);
        socket.to(room).emit('answer', answer);
    });

    socket.on('ice-candidate', (candidate, room) => {
        console.log(`ICE candidate from ${socket.id} to room ${room}`);
        socket.to(room).emit('ice-candidate', candidate);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
