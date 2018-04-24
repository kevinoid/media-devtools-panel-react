var connections = {};
var webrtc = {};
webrtc['peerConns'] = {};
webrtc['candidatePairs'] = {}; // arrays of candidate pairs by peerConn
webrtc['rtpRtcpStreams'] = {}; // arrays of rtp/rtcp streams by peerConn
webrtc['gums'] = {};

chrome.runtime.onConnect.addListener(function(port) {
  /* console.log('New connection (chrome.runtime.onConnect) from',
              port.name,
              port.sender.frameId,
              port); */

  var name = port.name;
  if (name === 'devtools') {
    // TODO
  }


  function buildCandidateAddress(candidate) {
    return candidate['ipAddress'] +
           ":" + candidate['portNumber'] +
           "/" + candidate['transport'] +
           "(" + candidate['candidateType'] + ")";
  }


  function extractCandidatePairs(msg) {
    let candidatePairs = webrtc['candidatePairs'];
    candidatePairs[msg.pcId] = [];

    let args = JSON.parse(msg.apiArgs);
    Object.values(args)
      .filter(arg => arg['type'] == 'candidate-pair')
      .forEach(arg => {
      let local = args[arg['localCandidateId']];
      let remote = args[arg['remoteCandidateId']];
      let bytesTx = arg['bytesSent'] || 0;
      let bytesRx = arg['bytesReceived'] || 0;
      let pairStr = "candidate-pair (" + arg['id'] + ")" +
                    " bytes (tx: " + bytesTx + 
                    "   rx: " + bytesRx +
                    ")" +
                    " local: " + buildCandidateAddress(local) +
                    " remote: " + buildCandidateAddress(remote);
      candidatePairs[msg.pcId].push(pairStr);
    });
  }


  function extractRtpRtcpStreams(msg) {
    let rtpRtcpStreams = webrtc['rtpRtcpStreams'];
    rtpRtcpStreams[msg.pcId] = [];

    let args = JSON.parse(msg.apiArgs);
    Object.values(args)
      .filter(arg => arg['type'] == 'inbound-rtp')
      .forEach(arg => {
      let streamStr = arg['type'] + " " + arg['mediaType'] +
                      " (ssrc " + arg['ssrc'] + ")" +
                      " bytes rx: " + arg['bytesReceived'] +
                      " packets rx: " + arg['packetsReceived'] +
                      " lost: " + arg['packetsLost'];
      rtpRtcpStreams[msg.pcId].push(streamStr);
    });
    Object.values(args)
      .filter(arg => arg['type'] == 'outbound-rtp')
      .forEach(arg => {
      let streamStr = arg['type'] + " " + arg['mediaType'] +
                      " (ssrc " + arg['ssrc'] + ")" +
                      " bytes tx: " + arg['bytesSent'] +
                      " packets tx: " + arg['packetsSent'];
      rtpRtcpStreams[msg.pcId].push(streamStr);
    });
  }


  function listener(msg, sender, reply)
  {
    var tabId;

    if (msg.tabId)
      tabId = msg.tabId
    else tabId = sender.sender.tab.id;

    if (!connections[tabId])
      connections[tabId] = {};
    connections[tabId][name] = port;

    if (name === 'panel') {
      switch (msg.action) {
        case 'get-media':
          browser.tabs.executeScript({ file: "extractMediaInfo.js" })
            .then(results => {
              port.postMessage({
                action : 'got-media-info',
                value : JSON.stringify(results, null, 2)
              });
            })
            .catch(err => {
              port.postMessage({
                action : 'got-media-info-error',
                value : err.toString()
              });
            });
          break;
        case 'get-webrtc':
          port.postMessage({action : 'got-webrtc-info',
                            value : JSON.stringify(webrtc, null, 2)
                           });
          break;
        case 'clear-webrtc-data':
          webrtc['peerConns'] = {};
          webrtc['candidatePairs'] = {};
          webrtc['rtpRtcpStreams'] = {};
          webrtc['gums'] = {};
          break;
        default:
          break;
      }
    } else if (name === 'webrtc-pc-api'
               && msg.apiMethod === 'getStatsInternal'
               && msg.pcId !== undefined) {
      extractCandidatePairs(msg);
      extractRtpRtcpStreams(msg);
    } else if (name === 'webrtc-pc-api'
               && msg.pcId !== undefined) {
      let peerConns = webrtc['peerConns'];
      if (!peerConns[msg.pcId]) {
        peerConns[msg.pcId] = {};
        peerConns[msg.pcId]['apiCallCnt'] = 0;
        peerConns[msg.pcId]['apiCalls'] = [];
      }
      peerConns[msg.pcId]['apiCallCnt']++;
      peerConns[msg.pcId]['apiCalls'].push(msg);
    } else if (name === 'webrtc-gum-api'
               && msg.pcId !== undefined) {
      let gums = webrtc['gums'];
      if (!gums[msg.pcId]) {
        gums[msg.pcId] = {};
        gums[msg.pcId]['apiCallCnt'] = 0;
        gums[msg.pcId]['apiCalls'] = [];
      }
      gums[msg.pcId]['apiCallCnt']++;
      gums[msg.pcId]['apiCalls'].push(msg);
    }
  }

  port.onMessage.addListener(listener);

  port.onDisconnect.addListener(function() {

    port.onMessage.removeListener(listener);

    // console.log(name, 'disconnect (chrome.runtime.onDisconnect)');

    Object.keys(connections).forEach(c => {
      if (connections[c][name] === port) {
        connections[c][name] = null;
        delete connections[c][name];
      }
      if (Object.keys(connections[c]).length === 0) {
        connections[c] = null;
        delete connections[c];
      }
    })

  });

  return true;

});
