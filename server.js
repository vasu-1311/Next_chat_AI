const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path'); // Naya add kiya deployment ke liye

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Static files ke liye path fix kiya
app.use(express.static(path.join(__dirname, 'public')));

let waitingQueue = [];

io.on('connection', (socket) => {
    socket.on('find-partner', (userData) => {
        waitingQueue = waitingQueue.filter(u => u.id !== socket.id);
        
        let partnerIndex = waitingQueue.findIndex(u => 
            u.data.interests.toLowerCase() === userData.interests.toLowerCase() && userData.interests !== ""
        );
        if (partnerIndex === -1 && waitingQueue.length > 0) partnerIndex = 0;

        if (partnerIndex !== -1) {
            const partner = waitingQueue.splice(partnerIndex, 1)[0];
            const room = partner.id;
            socket.join(room);
            io.to(partner.id).emit('found-partner', { room, partnerData: userData });
            socket.emit('found-partner', { room, partnerData: partner.data });
        } else {
            waitingQueue.push({ id: socket.id, data: userData });
            socket.emit('waiting');
        }
    });

    socket.on('video-offer', (data) => socket.to(data.room).emit('video-offer', data));
    socket.on('video-answer', (data) => socket.to(data.room).emit('video-answer', data));
    socket.on('ice-candidate', (data) => socket.to(data.room).emit('ice-candidate', data));
    socket.on('send-message', (data) => socket.to(data.room).emit('receive-message', data.message));
    socket.on('typing', (data) => socket.to(data.room).emit('typing', data.isTyping));

    socket.on('disconnect', () => {
        waitingQueue = waitingQueue.filter(u => u.id !== socket.id);
    });
});

// Port configuration Render/Deployment ke liye
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server live on port ${PORT}`);
});