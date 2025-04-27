const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
let localStream;
let peerConnection;
let pendingCandidates = [];
const room = "my-room"; // Room name

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }, // Google's public STUN server
    ],
};

// Create the peer connection
async function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    // On ICE candidate
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('Sending ICE candidate');
            socket.emit('ice-candidate', event.candidate, room);
        }
    };

    // On receiving remote stream
    peerConnection.ontrack = (event) => {
        if (remoteVideo.srcObject !== event.streams[0]) {
            remoteVideo.srcObject = event.streams[0];
            console.log('Remote stream added');
        }
    };

    // Add tracks from local stream
    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        console.log('Added local stream tracks');
    }

    // ICE connection state change (helps in debugging)
    peerConnection.oniceconnectionstatechange = () => {
        console.log(`ICE connection state: ${peerConnection.iceConnectionState}`);
    };

    // Set signaling state change handler to track connection state
    peerConnection.onsignalingstatechange = () => {
        console.log(`Signaling state: ${peerConnection.signalingState}`);
    };
}

// Join the room
socket.emit('join', room);

socket.on('joined', async () => {
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

    try {
        // Only set remote description if it's not already set
        if (peerConnection.signalingState === 'stable') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        }
        // Create and send an answer
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer, room);

        // Add pending candidates
        pendingCandidates.forEach(candidate => {
            peerConnection.addIceCandidate(candidate);
        });
        pendingCandidates = [];
    } catch (error) {
        console.error('Error handling offer:', error);
    }
});

// Handle received answer
socket.on('answer', async (answer) => {
    console.log('Received answer');
    try {
        if (peerConnection && peerConnection.signalingState === 'have-local-offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    } catch (error) {
        console.error('Error setting remote answer:', error);
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
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer, room);
    } catch (error) {
        console.error('Error creating offer:', error);
    }
}
