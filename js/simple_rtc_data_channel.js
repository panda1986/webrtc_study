// set up local peer
var localConnection = new RTCPeerConnection();
var sendChannel = localConnection.createDataChannel("sendChannel");
sendChannel.onopen = onSendChannelStateChange;
sendChannel.onclose = onSendChannelStateChange;
var dataChannelCounter = 0;

// set up remote peer
var remoteConnection = new RTCPeerConnection();
remoteConnection.ondatachannel = receiveChannelCallback;

// set up the ICE candidates
localConnection.onicecandidate = function (e) {
    if (e.candidate) {
        remoteConnection.addIceCandidate(e.candidate, function () {
            console.log("remote add ice candidate success");
            //trigger sendChannel state change to open
        }, function (e) {
            console.log("remote failed to add ice candidate, err=" + e.toString())
        })
    }
};
remoteConnection.onicecandidate = function (e) {
    if (e.candidate) {
        localConnection.addIceCandidate(e.candidate, function () {
            console.log("local add ice candidate success")
        }, function (e) {
            console.log("local failed to add ice candidate, err=" + e.toString())
        })
    }
};

function onCreateSessionDescriptionError(e) {
    console.log("Failed to create session desc, e=" + e.toString())
}
function onSetSessionDescriptionSuccess() {
    console.log("on set session desc success")
}
function onSetSessionDescriptionError(e) {
    console.log("Failed to set session desc, e=" + e.toString())
}
localConnection.createOffer().then(function (desc) {
    localConnection.setLocalDescription(desc).then(onSetSessionDescriptionSuccess, onSetSessionDescriptionError);
    remoteConnection.setRemoteDescription(desc).then(onSetSessionDescriptionSuccess, onSetSessionDescriptionError);

    remoteConnection.createAnswer().then(function (desc) {
        remoteConnection.setLocalDescription(desc).then(onSetSessionDescriptionSuccess, onSetSessionDescriptionError);
        localConnection.setRemoteDescription(desc).then(onSetSessionDescriptionSuccess, onSetSessionDescriptionError);
    }, onCreateSessionDescriptionError)
}, onCreateSessionDescriptionError);

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
