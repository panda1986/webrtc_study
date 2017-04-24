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

var yourVideo = document.querySelector("#yours");
var theirVideo = document.querySelector("#theirs");
var mConn, tConn;
var constraint = {video: true, audio: false};

if (hasUserMedia()) {
    var gotStream = function (stream) {
        yourVideo.src = window.URL.createObjectURL(stream);
        if (hasRTCPeerConnection()) {
            startPeerConnection(stream)
        } else {
            alert("sorry, your brower doesn't support WebRTC")
        }
    };

    var onStreamError = function () {
        alert("sorry, we failed to capture you camera, please try again")
    };
    navigator.getUserMedia(constraint, gotStream, onStreamError)
} else {
    alert("sorry, your brower doesn't support WebRTC")
}

// 创建RTCPeerConnection, 建立SDP offer和返回, 为双方寻找ICE候选路径
// 执行offer和返回answer, 以构成对等连接
var offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 1
};
function startPeerConnection(stream) {
    var configuration = {
        //"iceServers": [{"url": "stun:127.0.0.1:198;6"}]
    };
    mConn = new RTCPeerConnection(configuration);
    tConn = new RTCPeerConnection(configuration);

    // create ICE
    // The RTCPeerConnection.onicecandidate property is an EventHandler which specifies a function to be called when the icecandidate event occurs on an RTCPeerConnection instance. This happens whenever the local ICE agent needs to deliver a message to the other peer through the signaling server.
    mConn.onicecandidate = function (event) {
        if (event.candidate) {
            tConn.addIceCandidate(event.candidate, function () {
                console.log("tConn addIceCandidate success")
            }, function () {
                console.log("tConn failed to add ICE Candidate:" + event.toString())
            })
        }
    };
    tConn.onicecandidate = function (event) {
        if (event.candidate) {
            mConn.addIceCandidate(event.candidate, function () {
                console.log("mConn addIceCandidate success")
            }, function () {
                console.log("mConn failed to add ICE Candidate:" + event.toString())
            })
        }
    };

    mConn.addStream(stream);
    tConn.onaddstream = function (e) {
        theirVideo.src = window.URL.createObjectURL(e.stream)
    };

    // start offer
    mConn.createOffer(offerOptions).then(onCreateOfferSuccess, function (error) {
        console.log('Failed to create session description: ' + error.toString());
    });

    function onCreateOfferSuccess(desc) {
        console.log('Offer from mConn\n' + desc.sdp);
        console.log('mConn setLocalDescription start');
        mConn.setLocalDescription(desc).then(
            function() {
                console.log("mConn setLocalDescription complete")
            },
            function (error) {
                console.log("Failed to set session description: " + error.toString())
            }
        );
        console.log('tConn setRemoteDescription start');
        tConn.setRemoteDescription(desc).then(
            function() {
                console.log("tConn setRemoteDescription complete")
            },
            function (error) {
                console.log("Failed to set session description: " + error.toString())
            }
        );

        console.log('tConn createAnswer start');
        // Since the 'remote' side has no media stream we need
        // to pass in the right constraints in order for it to
        // accept the incoming offer of audio and video.
        tConn.createAnswer().then(
            onCreateAnswerSuccess,
            function (error) {
                console.log('Failed to create session description: ' + error.toString());
            }
        );

        function onCreateAnswerSuccess(desc) {
            console.log('Answer from tConn:\n' + desc.sdp);
            console.log('tConn setLocalDescription start');
            tConn.setLocalDescription(desc).then(
                function() {
                    console.log("tConn setLocalDescription complete")
                },
                function (error) {
                    console.log("Failed to set session description: " + error.toString())
                }
            );
            console.log('mConn setRemoteDescription start');
            mConn.setRemoteDescription(desc).then(
                function() {
                    console.log("mConn setRemoteDescription complete")
                },
                function (error) {
                    console.log("Failed to set session description: " + error.toString())
                }
            );
        }
    }
}