const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Sabhi origins ko allow karne ke liye
    methods: ["GET", "POST"]
  }
});

// Static files ke liye public folder link karo
app.use(express.static(path.join(__dirname, 'public')));

let waitingQueue = [];

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Jab user "Next" ya "Find Partner" click kare
    socket.on('find-partner', (userData) => {
        // Purani queue se safai
        waitingQueue = waitingQueue.filter(u => u.id !== socket.id);

        if (waitingQueue.length > 0) {
            // Agar koi wait kar raha hai toh use connect karo
            const partner = waitingQueue.shift();
            const roomName = `room-${socket.id}-${partner.id}`;

            socket.join(roomName);
            partner.socket.join(roomName);

            // Dono ko batao ki partner mil gaya
            io.to(roomName).emit('found-partner', { room: roomName });
            console.log('Matched:', socket.id, 'with', partner.id);
        } else {
            // Agar koi nahi hai toh queue mein daal do
            waitingQueue.push({ id: socket.id, socket: socket });
            console.log('User added to queue:', socket.id);
        }
    });

    // WebRTC Signaling: Offer, Answer aur ICE Candidates
    socket.on('video-offer', (data) => {
        socket.to(data.room).emit('video-offer', data);
    });

    socket.on('video-answer', (data) => {
        socket.to(data.room).emit('video-answer', data);
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.room).emit('ice-candidate', data);
    });

    // Disconnect hone par queue se hatao
    socket.on('disconnect', () => {
        waitingQueue = waitingQueue.filter(u => u.id !== socket.id);
        console.log('User disconnected:', socket.id);
    });
});

// Render ka port use karein ya local ke liye 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
