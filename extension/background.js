var connections = {};
var webrtc = {};
webrtc['peerConns'] = {};
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
        default:
          break;
      }
    } else if (name === 'webrtc-pc-api') {
      let peerConns = webrtc['peerConns'];
      if (msg.pcId !== undefined && !peerConns[msg.pcId]) {
        peerConns[msg.pcId] = {};
        peerConns[msg.pcId]['apiCallCnt'] = 0;
        peerConns[msg.pcId]['apiCalls'] = [];
      }
      peerConns[msg.pcId]['apiCallCnt']++;
      peerConns[msg.pcId]['apiCalls'].push(msg);
    } else if (name === 'webrtc-gum-api') {
      let gums = webrtc['gums'];
      if (msg.pcId !== undefined && !gums[msg.pcId]) {
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
