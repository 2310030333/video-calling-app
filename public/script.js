const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
let localStream;
let peerConnection;
let pendingCandidates = [];
let isCaller = false;

const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

async function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
        socket.emit('ice-candidate', event.candidate);
    }
};

    peerConnection.ontrack = (event) => {
    // First time only, set remote video
    if (remoteVideo.srcObject !== event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
    }
};

    if (localStream) {
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }
}

document.getElementById('startCall').onclick = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    await createPeerConnection();

    isCaller = true;  // I am starting the call
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);
};

socket.on('offer', async (offer) => {
    if (!peerConnection) {
        await createPeerConnection();
    }

    // 🔥 Get local media stream (camera + mic) for callee
    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);

    // Process pending ICE candidates
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
    console.log('Received answer');
    if (!isCaller) {
        console.warn('I am not the caller, ignoring answer.');
        return;
    }

    if (peerConnection.signalingState === 'have-local-offer') {
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
            pendingCandidates.push(new RTCIceCandidate(candidate));
        }
    }
});

socket.on('ice-candidate', async (candidate) => {
    if (peerConnection) {
        try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.error('Error adding ICE candidate:', e);
        }
    }
});

