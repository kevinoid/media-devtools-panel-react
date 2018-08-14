var connections = {};
var webrtc = {};
webrtc['peerConns'] = {};
webrtc['candidatePairs'] = {}; // arrays of candidate pairs by peerConn
webrtc['rtpRtcpStreams'] = {}; // arrays of rtp/rtcp streams by peerConn
webrtc['gums'] = {};

// uncomment the following line to generate some test data that is helpful
// during developement (to avoid having to start/stop actual webrtc stuff)
//buildTestData();

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

      candidatePairs[msg.pcId].push({id:arg['id'],
                                     bytesTx:bytesTx,
                                     bytesRx:bytesRx,
                                     localCand:buildCandidateAddress(local),
                                     remoteCand:buildCandidateAddress(remote)
                                    });
    });
  }


  function extractRtpRtcpStreams(msg) {
    let rtpRtcpStreams = webrtc['rtpRtcpStreams'];
    rtpRtcpStreams[msg.pcId] = [];

    let args = JSON.parse(msg.apiArgs);
    Object.values(args)
      .filter(arg => arg['type'] == 'inbound-rtp')
      .forEach(arg => {
      rtpRtcpStreams[msg.pcId].push({id:arg['type'],
                                     mediaType:'in '+arg['mediaType'],
                                     ssrc:arg['ssrc'],
                                     bytesRx:arg['bytesReceived'],
                                     pktsRx:arg['packetsReceived'],
                                     bytesTx:'-',
                                     pktsTx:'-',
                                     pktsLost:arg['packetsLost']
                                    });
    });
    Object.values(args)
      .filter(arg => arg['type'] == 'outbound-rtp')
      .forEach(arg => {
      rtpRtcpStreams[msg.pcId].push({id:arg['type'],
                                     mediaType:'out '+arg['mediaType'],
                                     ssrc:arg['ssrc'],
                                     bytesRx:'-',
                                     pktsRx:'-',
                                     bytesTx:arg['bytesSent'],
                                     pktsTx:arg['packetsSent'],
                                     pktsLost:'-'
                                    });
    });
  }


  function writeSaveFile(htmlToSave)
  {
    // these really should be read from the 2 css files included with
    // the extension to avoid issues if we ever update the css files
    // (and forget to update here)
    let css1 = ".ReactTable{position:relative;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;border:1px solid rgba(0,0,0,0.1);}.ReactTable *{box-sizing:border-box}.ReactTable .rt-table{-webkit-box-flex:1;-ms-flex:auto 1;flex:auto 1;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-align:stretch;-ms-flex-align:stretch;align-items:stretch;width:100%;border-collapse:collapse;overflow:auto}.ReactTable .rt-thead{-webkit-box-flex:1;-ms-flex:1 0 auto;flex:1 0 auto;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;}.ReactTable .rt-thead.-headerGroups{background:rgba(0,0,0,0.03);border-bottom:1px solid rgba(0,0,0,0.05)}.ReactTable .rt-thead.-filters{border-bottom:1px solid rgba(0,0,0,0.05);}.ReactTable .rt-thead.-filters input,.ReactTable .rt-thead.-filters select{border:1px solid rgba(0,0,0,0.1);background:#fff;padding:5px 7px;font-size:inherit;border-radius:3px;font-weight:normal;outline:none}.ReactTable .rt-thead.-filters .rt-th{border-right:1px solid rgba(0,0,0,0.02)}.ReactTable .rt-thead.-header{box-shadow:0 2px 15px 0 rgba(0,0,0,0.15)}.ReactTable .rt-thead .rt-tr{text-align:center}.ReactTable .rt-thead .rt-th,.ReactTable .rt-thead .rt-td{padding:5px 5px;line-height:normal;position:relative;border-right:1px solid rgba(0,0,0,0.05);transition:box-shadow .3s cubic-bezier(.175,.885,.32,1.275);box-shadow:inset 0 0 0 0 transparent;}.ReactTable .rt-thead .rt-th.-sort-asc,.ReactTable .rt-thead .rt-td.-sort-asc{box-shadow:inset 0 3px 0 0 rgba(0,0,0,0.6)}.ReactTable .rt-thead .rt-th.-sort-desc,.ReactTable .rt-thead .rt-td.-sort-desc{box-shadow:inset 0 -3px 0 0 rgba(0,0,0,0.6)}.ReactTable .rt-thead .rt-th.-cursor-pointer,.ReactTable .rt-thead .rt-td.-cursor-pointer{cursor:pointer}.ReactTable .rt-thead .rt-th:last-child,.ReactTable .rt-thead .rt-td:last-child{border-right:0}.ReactTable .rt-thead .rt-resizable-header{overflow:visible;}.ReactTable .rt-thead .rt-resizable-header:last-child{overflow:hidden}.ReactTable .rt-thead .rt-resizable-header-content{overflow:hidden;text-overflow:ellipsis}.ReactTable .rt-thead .rt-header-pivot{border-right-color:#f7f7f7}.ReactTable .rt-thead .rt-header-pivot:after,.ReactTable .rt-thead .rt-header-pivot:before{left:100%;top:50%;border:solid transparent;content:\" \";height:0;width:0;position:absolute;pointer-events:none}.ReactTable .rt-thead .rt-header-pivot:after{border-color:rgba(255,255,255,0);border-left-color:#fff;border-width:8px;margin-top:-8px}.ReactTable .rt-thead .rt-header-pivot:before{border-color:rgba(102,102,102,0);border-left-color:#f7f7f7;border-width:10px;margin-top:-10px}.ReactTable .rt-tbody{-webkit-box-flex:99999;-ms-flex:99999 1 auto;flex:99999 1 auto;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;overflow:auto;}.ReactTable .rt-tbody .rt-tr-group{border-bottom:solid 1px rgba(0,0,0,0.05);}.ReactTable .rt-tbody .rt-tr-group:last-child{border-bottom:0}.ReactTable .rt-tbody .rt-td{border-right:1px solid rgba(0,0,0,0.02);}.ReactTable .rt-tbody .rt-td:last-child{border-right:0}.ReactTable .rt-tbody .rt-expandable{cursor:pointer}.ReactTable .rt-tr-group{-webkit-box-flex:1;-ms-flex:1 0 auto;flex:1 0 auto;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-align:stretch;-ms-flex-align:stretch;align-items:stretch}.ReactTable .rt-tr{-webkit-box-flex:1;-ms-flex:1 0 auto;flex:1 0 auto;display:-webkit-inline-box;display:-ms-inline-flexbox;display:inline-flex}.ReactTable .rt-th,.ReactTable .rt-td{-webkit-box-flex:1;-ms-flex:1 0 0px;flex:1 0 0;white-space:nowrap;text-overflow:ellipsis;padding:7px 5px;overflow:hidden;transition:.3s ease;transition-property:width,min-width,padding,opacity;}.ReactTable .rt-th.-hidden,.ReactTable .rt-td.-hidden{width:0 !important;min-width:0 !important;padding:0 !important;border:0 !important;opacity:0 !important}.ReactTable .rt-expander{display:inline-block;position:relative;margin:0;color:transparent;margin:0 10px;}.ReactTable .rt-expander:after{content:'';position:absolute;width:0;height:0;top:50%;left:50%;-webkit-transform:translate(-50%,-50%) rotate(-90deg);transform:translate(-50%,-50%) rotate(-90deg);border-left:5.04px solid transparent;border-right:5.04px solid transparent;border-top:7px solid rgba(0,0,0,0.8);transition:all .3s cubic-bezier(.175,.885,.32,1.275);cursor:pointer}.ReactTable .rt-expander.-open:after{-webkit-transform:translate(-50%,-50%) rotate(0);transform:translate(-50%,-50%) rotate(0)}.ReactTable .rt-resizer{display:inline-block;position:absolute;width:36px;top:0;bottom:0;right:-18px;cursor:col-resize;z-index:10}.ReactTable .rt-tfoot{-webkit-box-flex:1;-ms-flex:1 0 auto;flex:1 0 auto;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;box-shadow:0 0 15px 0 rgba(0,0,0,0.15);}.ReactTable .rt-tfoot .rt-td{border-right:1px solid rgba(0,0,0,0.05);}.ReactTable .rt-tfoot .rt-td:last-child{border-right:0}.ReactTable.-striped .rt-tr.-odd{background:rgba(0,0,0,0.03)}.ReactTable.-highlight .rt-tbody .rt-tr:not(.-padRow):hover{background:rgba(0,0,0,0.05)}.ReactTable .-pagination{z-index:1;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:stretch;-ms-flex-align:stretch;align-items:stretch;-ms-flex-wrap:wrap;flex-wrap:wrap;padding:3px;box-shadow:0 0 15px 0 rgba(0,0,0,0.1);border-top:2px solid rgba(0,0,0,0.1);}.ReactTable .-pagination input,.ReactTable .-pagination select{border:1px solid rgba(0,0,0,0.1);background:#fff;padding:5px 7px;font-size:inherit;border-radius:3px;font-weight:normal;outline:none}.ReactTable .-pagination .-btn{-webkit-appearance:none;-moz-appearance:none;appearance:none;display:block;width:100%;height:100%;border:0;border-radius:3px;padding:6px;font-size:1em;color:rgba(0,0,0,0.6);background:rgba(0,0,0,0.1);transition:all .1s ease;cursor:pointer;outline:none;}.ReactTable .-pagination .-btn[disabled]{opacity:.5;cursor:default}.ReactTable .-pagination .-btn:not([disabled]):hover{background:rgba(0,0,0,0.3);color:#fff}.ReactTable .-pagination .-previous,.ReactTable .-pagination .-next{-webkit-box-flex:1;-ms-flex:1;flex:1;text-align:center}.ReactTable .-pagination .-center{-webkit-box-flex:1.5;-ms-flex:1.5;flex:1.5;text-align:center;margin-bottom:0;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;-ms-flex-wrap:wrap;flex-wrap:wrap;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-ms-flex-pack:distribute;justify-content:space-around}.ReactTable .-pagination .-pageInfo{display:inline-block;margin:3px 10px;white-space:nowrap}.ReactTable .-pagination .-pageJump{display:inline-block;}.ReactTable .-pagination .-pageJump input{width:70px;text-align:center}.ReactTable .-pagination .-pageSizeOptions{margin:3px 10px}.ReactTable .rt-noData{display:block;position:absolute;left:50%;top:50%;-webkit-transform:translate(-50%,-50%);transform:translate(-50%,-50%);background:rgba(255,255,255,0.8);transition:all .3s ease;z-index:1;pointer-events:none;padding:20px;color:rgba(0,0,0,0.5)}.ReactTable .-loading{display:block;position:absolute;left:0;right:0;top:0;bottom:0;background:rgba(255,255,255,0.8);transition:all .3s ease;z-index:-1;opacity:0;pointer-events:none;}.ReactTable .-loading > div{position:absolute;display:block;text-align:center;width:100%;top:50%;left:0;font-size:15px;color:rgba(0,0,0,0.6);-webkit-transform:translateY(-52%);transform:translateY(-52%);transition:all .3s cubic-bezier(.25,.46,.45,.94)}.ReactTable .-loading.-active{opacity:1;z-index:2;pointer-events:all;}.ReactTable .-loading.-active > div{-webkit-transform:translateY(50%);transform:translateY(50%)}.ReactTable .rt-resizing .rt-th,.ReactTable .rt-resizing .rt-td{transition:none !important;cursor:col-resize;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}";
    let css2 = ".ReactVirtualized__Collection {}.ReactVirtualized__Collection__innerScrollContainer {}/* Grid default theme */.ReactVirtualized__Grid {}.ReactVirtualized__Grid__innerScrollContainer {}/* Table default theme */.ReactVirtualized__Table {}.ReactVirtualized__Table__Grid {}.ReactVirtualized__Table__headerRow {  font-weight: 700;  text-transform: uppercase;  display: -webkit-flex;  display: -moz-box;  display: -ms-flexbox;  display: flex;  -webkit-flex-direction: row;     -moz-box-orient: horizontal;     -moz-box-direction: normal;      -ms-flex-direction: row;          flex-direction: row;  -webkit-align-items: center;     -moz-box-align: center;      -ms-flex-align: center;          align-items: center;}.ReactVirtualized__Table__row {  display: -webkit-flex;  display: -moz-box;  display: -ms-flexbox;  display: flex;  -webkit-flex-direction: row;     -moz-box-orient: horizontal;     -moz-box-direction: normal;      -ms-flex-direction: row;          flex-direction: row;  -webkit-align-items: center;     -moz-box-align: center;      -ms-flex-align: center;          align-items: center;}.ReactVirtualized__Table__headerTruncatedText {  display: inline-block;  max-width: 100%;  white-space: nowrap;  text-overflow: ellipsis;  overflow: hidden;}.ReactVirtualized__Table__headerColumn,.ReactVirtualized__Table__rowColumn {  margin-right: 10px;  min-width: 0px;}.ReactVirtualized__Table__rowColumn {  text-overflow: ellipsis;  white-space: nowrap;}.ReactVirtualized__Table__headerColumn:first-of-type,.ReactVirtualized__Table__rowColumn:first-of-type {  margin-left: 10px;}.ReactVirtualized__Table__sortableHeaderColumn {  cursor: pointer;}.ReactVirtualized__Table__sortableHeaderIconContainer {  display: -webkit-flex;  display: -moz-box;  display: -ms-flexbox;  display: flex;  -webkit-align-items: center;     -moz-box-align: center;      -ms-flex-align: center;          align-items: center;}.ReactVirtualized__Table__sortableHeaderIcon {  -webkit-flex: 0 0 24px;     -moz-box-flex: 0;      -ms-flex: 0 0 24px;          flex: 0 0 24px;  height: 1em;  width: 1em;  fill: currentColor;}/* List default theme */.ReactVirtualized__List {}";
    var blob = new Blob(["<html>",
                         "<head><style>",
                         css1,
                         css2,
                         "</style></head>",
                         "<body>",
                         htmlToSave,
                         "</body></html>"], {
          type: 'text/html'
        });
    var url = URL.createObjectURL(blob);
    var fileName = 'webrtcDevtool.html';
    var options = {
        filename: fileName,
        url: url,
    //     conflictAction: conflictAction
    };
    browser.downloads.download(options, function(downloadId) {
        if (downloadId) {
          console.log('Saved to downloads folder.');
        } else {
          var error = browser.runtime.lastError.toString();
          if (error.indexOf('Download canceled by the user') >= 0) {
            console.log('Save canceled.');
          } else {
            console.log('Error occured during save.');
          }
        }
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
        case 'save-webrtc-data':
          writeSaveFile(msg.data);
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

function buildTestData() {
      let peerConns = webrtc['peerConns'];
      let rtpRtcpStreams = webrtc['rtpRtcpStreams'];
      let candidatePairs = webrtc['candidatePairs'];
      let gums = webrtc['gums'];

      let testId = "testId1";
      peerConns[testId] = {};
      peerConns[testId]['apiCallCnt'] = 2;
      peerConns[testId]['apiCalls'] = [
        {
          apiType: "WebRTC-Func",
          pcId: testId,
          apiDate: "2018-08-23T15:12:19.941Z",
          apiMethod: "create",
          apiArgs: "[null]"
        },
        {
          apiType: "WebRTC-Func",
          pcId: testId,
          apiDate: "2018-08-23T15:12:19.942Z",
          apiMethod: "addTrack",
          apiArgs: "[{},{}]"
        }];
      candidatePairs[testId] = [
        {
          "id": "I5gF",
          "bytesTx": 370505,
          "bytesRx": 976,
          "localCand": "172.20.10.2:52366/udp(host)",
          "remoteCand": "172.20.10.2:50637/udp(host)"
        }];
      rtpRtcpStreams[testId] = [
        {
          "id": "inbound-rtp",
          "mediaType": "in audio",
          "ssrc": 784814300,
          "bytesRx": 31411,
          "pktsRx": 311,
          "bytesTx": "-",
          "pktsTx": "-",
          "pktsLost": 0
        },
        {
          "id": "inbound-rtp",
          "mediaType": "in video",
          "ssrc": 694522998,
          "bytesRx": 293167,
          "pktsRx": 394,
          "bytesTx": "-",
          "pktsTx": "-",
          "pktsLost": 0
        },
        {
          "id": "outbound-rtp",
          "mediaType": "out audio",
          "ssrc": 784814300,
          "bytesRx": "-",
          "pktsRx": "-",
          "bytesTx": 54087,
          "pktsTx": 447,
          "pktsLost": "-"
        },
        {
          "id": "outbound-rtp",
          "mediaType": "out video",
          "ssrc": 694522998,
          "bytesRx": "-",
          "pktsRx": "-",
          "bytesTx": 306179,
          "pktsTx": 394,
          "pktsLost": "-"
        }];

      testId = "testId2";
      peerConns[testId] = {};
      peerConns[testId]['apiCallCnt'] = 2;
      peerConns[testId]['apiCalls'] = [
        {
          "apiType": "WebRTC-Func",
          "pcId": testId,
          "apiDate": "2018-08-23T15:12:19.942Z",
          "apiMethod": "create",
          "apiArgs": "[null]"
        },
        {
          "apiType": "WebRTC-Func",
          "pcId": testId,
          "apiDate": "2018-08-23T15:12:19.950Z",
          "apiMethod": "setRemoteDescription",
          "apiArgs": "[{\"type\":\"offer\",\"sdp\":\"v=0\\r\\no=mozilla...THIS_IS_SDPARTA-63.0a1 8222402274416258097 0 IN IP4 0.0.0.0\\r\\ns=-\\r\\nt=0 0\\r\\na=fingerprint:sha-256 5C:D6:58:D3:EC:76:92:C0:33:AF:ED:64:89:A3:58:2D:DF:F9:E6:65:DD:9C:0E:69:AD:EA:04:21:52:42:73:13\\r\\n\"}]"
        }];
      candidatePairs[testId] = [
        {
          "id": "VMnl",
          "bytesTx": 976,
          "bytesRx": 370505,
          "localCand": "172.20.10.2:50637/udp(host)",
          "remoteCand": "172.20.10.2:52366/udp(host)"
        }];
      rtpRtcpStreams[testId] = [
        {
          "id": "inbound-rtp",
          "mediaType": "in audio",
          "ssrc": 784814300,
          "bytesRx": 54087,
          "pktsRx": 447,
          "bytesTx": "-",
          "pktsTx": "-",
          "pktsLost": 0
        },
        {
          "id": "inbound-rtp",
          "mediaType": "in video",
          "ssrc": 694522998,
          "bytesRx": 306179,
          "pktsRx": 394,
          "bytesTx": "-",
          "pktsTx": "-",
          "pktsLost": 0
        },
        {
          "id": "outbound-rtp",
          "mediaType": "out audio",
          "ssrc": 784814300,
          "bytesRx": "-",
          "pktsRx": "-",
          "bytesTx": 35975,
          "pktsTx": 356,
          "pktsLost": "-"
        },
        {
          "id": "outbound-rtp",
          "mediaType": "out video",
          "ssrc": 694522998,
          "bytesRx": "-",
          "pktsRx": "-",
          "bytesTx": 251760,
          "pktsTx": 346,
          "pktsLost": "-"
        }];

      testId = "testId3";
      gums[testId] = {};
      gums[testId]['apiCallCnt'] = 2;
      gums[testId]['apiCalls'] = [
        {
          "apiType": "WebRTC-Gum",
          "pcId": testId,
          "apiDate": "2018-08-23T15:09:34.033Z",
          "apiMethod": "navigator.mediaDevices.getUserMedia",
          "apiArgs": "{\"audio\":true,\"video\":true}"
        },
        {
          "apiType": "WebRTC-Gum",
          "pcId": testId,
          "apiDate": "2018-08-23T15:09:35.562Z",
          "apiMethod": "navigator.mediaDevices.getUserMediaOnSuccess",
          "apiArgs": "{\"id\":\"{cb01259c-9f59-1c44-a54d-0cbb4eddec2e}\",\"tracks\":[{\"id\":\"{28f685a7-f6f6-6747-a810-6a1d4dca67dc}\",\"kind\":\"audio\",\"label\":\"Internal Microphone\",\"enabled\":true,\"muted\":false,\"readyState\":\"live\"},{\"id\":\"{53453981-9429-c145-892c-733d2395d8e6}\",\"kind\":\"video\",\"label\":\"FaceTime HD Camera\",\"enabled\":true,\"muted\":false,\"readyState\":\"live\"}]}"
        }];
}
