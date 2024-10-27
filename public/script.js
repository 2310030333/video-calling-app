const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
let localStream;
let peerConnection;

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
    ],
};

document.getElementById('startCall').onclick = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    peerConnection = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', offer);
};

socket.on('offer', async (offer) => {
    peerConnection = new RTCPeerConnection(configuration);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', answer);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('candidate', event.candidate);
        }
    };

    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };
});

socket.on('answer', (answer) => {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', (candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});
