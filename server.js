const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

let waitingUsers = [];

io.on('connection', (socket) => {
    socket.on('find-partner', () => {
        waitingUsers = waitingUsers.filter(id => id !== socket.id);

        if (waitingUsers.length > 0) {
            const partnerId = waitingUsers.shift();
            const room = "room_" + socket.id + "_" + partnerId;

            // Dono ko room mein join karwao
            socket.join(room);
            const partnerSocket = io.sockets.sockets.get(partnerId);
            if (partnerSocket) {
                partnerSocket.join(room);
                // Dono ko room ID bhejo
                io.to(room).emit('found-partner', { room: room });
            }
        } else {
            waitingUsers.push(socket.id);
        }
    });

    socket.on('send-msg', (data) => {
        if (data.room) {
            socket.to(data.room).emit('receive-msg', { msg: data.msg });
        }
    });

    socket.on('video-offer', (data) => socket.to(data.room).emit('video-offer', data));
    socket.on('video-answer', (data) => socket.to(data.room).emit('video-answer', data));
    socket.on('ice-candidate', (data) => socket.to(data.room).emit('ice-candidate', data));

    socket.on('disconnect', () => {
        waitingUsers = waitingUsers.filter(id => id !== socket.id);
    });
});

server.listen(process.env.PORT || 3000, () => console.log('Server Running...'));
