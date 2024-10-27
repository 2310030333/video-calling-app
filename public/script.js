// public/script.js
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCallButton = document.getElementById('startCall');

let localStream;
let remoteStream;
let peerConnection;

const socket = io();

// Room name for signaling (could be dynamic or hardcoded for demo purposes)
const ROOM_NAME = 'video-call-room';

socket.emit('join', ROOM_NAME);

startCallButton.onclick = async () => {
    // Get user media
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    // Set up the peer connection
    peerConnection = new RTCPeerConnection();

    // Add local stream tracks to peer connection
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    // Handle the event when a remote track arrives
    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    // Send ICE candidates to the other peer
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', { room: ROOM_NAME, candidate: event.candidate });
        }
    };

    // Create an offer and send it to the other peer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { room: ROOM_NAME, offer });
};

// Listen for offer, answer, and candidate messages from the server
socket.on('offer', async (data) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { room: ROOM_NAME, answer });
});

socket.on('answer', async (data) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
});

socket.on('candidate', async (data) => {
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
});
