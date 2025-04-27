const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
let localStream;
let peerConnection;
let pendingCandidates = [];

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
    ],
};

async function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }
}

document.getElementById('startCall').onclick = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    await createPeerConnection();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);
};

socket.on('offer', async (offer) => {
    console.log('Received offer');
    if (!peerConnection) {
        await createPeerConnection();
    }

    if (peerConnection.signalingState !== 'stable') {
        console.warn('PeerConnection is not stable. Ignoring offer.');
        return;
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);

    for (let candidate of pendingCandidates) {
        try {
            await peerConnection.addIceCandidate(candidate);
        } catch (e) {
            console.error('Error adding pending candidate', e);
        }
    }
    pendingCandidates = [];
});

socket.on('answer', async (answer) => {
    if (peerConnection && peerConnection.signalingState === 'have-local-offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } else {
        console.warn('Unexpected answer received. Current signalingState:', peerConnection.signalingState);
    }
});

socket.on('candidate', async (candidate) => {
    if (peerConnection) {
        if (peerConnection.remoteDescription && peerConnection.remoteDescription.type) {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error('Error adding received ice candidate', e);
            }
        } else {
            // Remote description not set yet, queue the candidate
            pendingCandidates.push(new RTCIceCandidate(candidate));
        }
    }
});
