const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
let localStream;
let peerConnection;
let pendingCandidates = [];
const room = "my-room"; // Room name

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
    ],
};

// Create the peer connection
async function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    // On ICE candidate
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate, room);
        }
    };

    // On receiving remote stream
    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    // Add tracks from local stream
    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }
}

// Join the room
socket.emit('join', room);

socket.on('joined', async () => {
    // The user has joined the room successfully
    console.log(`Joined room: ${room}`);

    if (localStream) {
        await createPeerConnection();
    }
});

// Handle other user joining
socket.on('other-user-joined', () => {
    console.log('Other user joined the room');
    
    if (!peerConnection) {
        createPeerConnection();
    }
    // Create and send an offer
    createAndSendOffer();
});

// Handle received offer
socket.on('offer', async (offer) => {
    console.log('Received offer');
    if (!peerConnection) {
        await createPeerConnection();
    }

    // Set remote description
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // Create and send an answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer, room);

    // Add pending candidates
    pendingCandidates.forEach(candidate => {
        peerConnection.addIceCandidate(candidate);
    });
    pendingCandidates = [];
});

// Handle received answer
socket.on('answer', async (answer) => {
    console.log('Received answer');
    if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
});

// Handle received ICE candidates
socket.on('ice-candidate', async (candidate) => {
    console.log('Received ICE candidate');
    if (peerConnection) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.error('Error adding ICE candidate', e);
        }
    } else {
        // Buffer candidates until peer connection is ready
        pendingCandidates.push(candidate);
    }
});

// Start the call
document.getElementById('startCall').onclick = async () => {
    console.log('Start call button clicked');
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    socket.emit('join', room);

    // Create peer connection and send offer after joining
    createPeerConnection();
    createAndSendOffer();
};

// Create and send an offer to the other user
async function createAndSendOffer() {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer, room);
}
