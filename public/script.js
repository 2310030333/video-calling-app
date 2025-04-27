const socket = io();

let localStream;
let remoteStream;
let peerConnection;
let isCaller = false;
const room = 'my-room'; // make sure both users join the same room

const servers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
    ]
};

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCallButton = document.getElementById('startCall');

// Join the room
socket.emit('join', room);

socket.on('joined', async () => {
    console.log('Joined room:', room);
    await startLocalStream();
});

socket.on('other-user-joined', () => {
    console.log('Other user joined');
    startCallButton.disabled = false;
});

startCallButton.addEventListener('click', async () => {
    isCaller = true;
    createPeerConnection();
    addLocalTracks();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer, room);
});

socket.on('offer', async (offer) => {
    console.log('Received offer');
    if (!peerConnection) {
        createPeerConnection();
        addLocalTracks();
    }
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer, room);
});

socket.on('answer', async (answer) => {
    console.log('Received answer');
    if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
});

socket.on('ice-candidate', async (candidate) => {
    if (peerConnection) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('Error adding received ice candidate', error);
        }
    }
});

async function startLocalStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (error) {
        console.error('Error accessing media devices.', error);
    }
}

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(servers);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', event.candidate, room);
        }
    };

    peerConnection.ontrack = (event) => {
        if (!remoteStream) {
            remoteStream = new MediaStream();
            remoteVideo.srcObject = remoteStream;
        }
        remoteStream.addTrack(event.track);
    };
}

function addLocalTracks() {
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }
}
