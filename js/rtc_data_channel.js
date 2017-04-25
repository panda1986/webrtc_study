var localVideo = document.querySelector('div#local video');
var remoteVideo = document.querySelector('div#remote video');
var localStream = null;
var localPeerConnection;
var RemotePeerConnection;
var sendChannel;
var sendDataLoop;
var dataChannelCounter = 0;
var receiveChannel;

function hasUserMedia() {
    navigator.getUserMedia = navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

    return !!navigator.getUserMedia;
}

function hasRTCPeerConnection() {
    window.RTCPeerConnection = window.RTCPeerConnection ||
        window.webkitRTCPeerConnection || window.moaRTCPeerConnection;
    return window.RTCPeerConnection;
}

function gotStream(stream) {
    console.log("recieved local stream");
    localVideo.srcObject = stream;
    localStream = stream;

    localPeerConnection.addStream(localStream);
    localPeerConnection.createOffer(offerOptions).then(gotDescription1, onCreateSessionDescriptionError);
}
function gotRemoteStream(e) {
    remoteVideo.srcObject = e.stream;
}

// get Media
var constarints = {audio: true, video: true};
navigator.getUserMedia(constarints, gotStream, function (e) {
    console.log("navigator getUserMedia failed,err:", e)
});

// create peer connection
var servers = null;
localPeerConnection = new RTCPeerConnection(servers);
localPeerConnection.onicecandidate = function (e) {
    if (e.candidate) {
        RemotePeerConnection.addIceCandidate(e.candidate, function () {
            console.log("remote peer addIceCandidate success")
        }, function (e) {
            console.log("remote peer failed to add ICE Candidate:" + e.toString())
        })
    }
};
if (RTCPeerConnection.prototype.createDataChannel) {
    sendChannel = localPeerConnection.createDataChannel("sendDataChannel");
    sendChannel.onopen = onSendChannelStateChange;
    sendChannel.onclose = onSendChannelStateChange;
    sendChannel.onerror = onSendChannelStateChange;
};

RemotePeerConnection = new RTCPeerConnection(servers);
RemotePeerConnection.onicecandidate = function (e) {
    if (e.candidate) {
        localPeerConnection.addIceCandidate(e.candidate, function () {
            console.log("local peer addIceCandidate success")
        }, function (e) {
            console.log("local peer failed to add ICE Candidate:" + e.toString())
        })
    }
};
RemotePeerConnection.onaddstream = gotRemoteStream;
RemotePeerConnection.ondatachannel = receiveChannelCallback;

// create, set offer
var offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};
function onSetSessionDescriptionSuccess() {
    console.log("on set session desc success")
}
function onSetSessionDescriptionError(e) {
    console.log("Failed to set session desc, e=" + e.toString())
}
function gotDescription2(desc) {
    RemotePeerConnection.setLocalDescription(desc).then(onSetSessionDescriptionSuccess, onSetSessionDescriptionError);
    localPeerConnection.setRemoteDescription(desc).then(onSetSessionDescriptionSuccess, onSetSessionDescriptionError);
}
function gotDescription1(desc) {
    localPeerConnection.setLocalDescription(desc).then(onSetSessionDescriptionSuccess, onSetSessionDescriptionError);
    RemotePeerConnection.setRemoteDescription(desc).then(onSetSessionDescriptionSuccess, onSetSessionDescriptionError);

    // create answer
    RemotePeerConnection.createAnswer().then(gotDescription2, onCreateSessionDescriptionError);
}
function onCreateSessionDescriptionError(e) {
    console.log("Failed to create session desc, e=" + e.toString())
}

// data channel
function sendData() {
    var obj = {
        "timestamp": new Date(),
        "counter": dataChannelCounter
    };
    sendChannel.send(JSON.stringify(obj));
    console.log('DataChannel send counter: ' + dataChannelCounter);
    dataChannelCounter++;
}
function onSendChannelStateChange() {
    var readyState = sendChannel.readyState;
    console.log('Send channel state is: ' + readyState);
    if (readyState === 'open') {
        sendDataLoop = setInterval(sendData, 1000);
    } else {
        clearInterval(sendDataLoop);
    }
}
function receiveChannelCallback(event) {
    console.log('Receive Channel Callback');
    receiveChannel = event.channel;
    receiveChannel.onmessage = onReceiveMessageCallback;
    receiveChannel.onopen = onReceiveChannelStateChange;
    receiveChannel.onclose = onReceiveChannelStateChange;
}
function onReceiveMessageCallback(e) {
    console.log("DataChannel receive counter:" + e.data);
}
function onReceiveChannelStateChange() {
    console.log('Receive channel state is: ' + receiveChannel.readyState);
}
