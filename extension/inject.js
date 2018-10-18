var inject = '('+function() {
  function trace(method, id, args) {
    window.postMessage(['WebRTC-Func', id, method, JSON.stringify(args || {})], '*');
  }

  function traceProp(method, id, args) {
    window.postMessage(['WebRTC-Prop', id, method, JSON.stringify(args || {})], '*');
  }

  function traceGum(method, id, args) {
    window.postMessage(['WebRTC-Gum', id, method, JSON.stringify(args || {})], '*');
  }

  // transforms a maplike to an object. Mostly for getStats +
  // JSON.parse(JSON.stringify())
  function map2obj(m) {
    if (!m.entries) {
      return m;
    }
    var o = {};
    m.forEach(function(v, k) {
      o[k] = v;
    });
    return o;
  }

  if (!window.RTCPeerConnection) {
    return; // can happen e.g. when peerconnection is disabled in Firefox.
  }

  // setup a proxy for the window's RTCPeerConnection and trap the new operator
  // adapted from jib's proxy fiddle: https://jsfiddle.net/jib1/n6s9yhjb/
  window.RTCPeerConnection = new Proxy(window.RTCPeerConnection, {
    construct(Pc, args) {

      let newPeerConn = new Pc(...args);
      // give our proxied peerconnection an id number to make it easier to trace
      newPeerConn._id = Math.random().toString(36).substr(2, 10);
      trace('create', newPeerConn._id, args);

      // build a map for holding function proxies
      newPeerConn._fnProxies = new Map();

      // setup event listeners
      newPeerConn.addEventListener('icecandidate', function(e) {
        trace('onicecandidate', newPeerConn._id, e.candidate);
      });
      newPeerConn.addEventListener('addstream', function(e) {
        trace('onaddstream', newPeerConn._id, e.stream.id + ' ' + e.stream.getTracks().map(function(t) { return t.kind + ':' + t.id; }));
      });
      newPeerConn.addEventListener('removestream', function(e) {
        trace('onremovestream', newPeerConn._id, e.stream.id + ' ' + e.stream.getTracks().map(function(t) { return t.kind + ':' + t.id; }));
      });
      newPeerConn.addEventListener('track', function(e) {
        trace('ontrack', newPeerConn._id, e.track.id + ' ' + e.streams.map(function(s) { return s.id; }));
      });
      newPeerConn.addEventListener('signalingstatechange', function() {
        trace('onsignalingstatechange', newPeerConn._id, newPeerConn.signalingState);
      });
      newPeerConn.addEventListener('iceconnectionstatechange', function() {
        trace('oniceconnectionstatechange', newPeerConn._id, newPeerConn.iceConnectionState);
      });
      newPeerConn.addEventListener('icegatheringstatechange', function() {
        trace('onicegatheringstatechange', newPeerConn._id, newPeerConn.iceGatheringState);
      });
      newPeerConn.addEventListener('negotiationneeded', function() {
        trace('onnegotiationneeded', newPeerConn._id, {});
      });
      newPeerConn.addEventListener('datachannel', function(event) {
        trace('ondatachannel', newPeerConn._id, [event.channel.id, event.channel.label]);
      });

      window.setTimeout(function poll() {
        if (newPeerConn.signalingState !== 'closed') {
          window.setTimeout(poll, 1000);
        }
        newPeerConn.getStats().then(function(stats) {
          trace('getStatsInternal', newPeerConn._id, map2obj(stats));
        });
      }, 1000);

      function createProxyForMember(pc, key) {
        const member = pc[key];
        return new Proxy(member, {
          apply(func, thisArg, argumentsList) {
            // if this is the proxy at the top of the chain (most recently created), trace its operation
            // the original proxy might be replaced if someone overrides the function
            if (this === pc._fnProxies[key]) {
              trace(key, pc._id, argumentsList);
              // We special case createOffer and createAnswer because we
              // want to record the results of the promise.  We build a
              // new promise to wrap the output of the
              // createOffer/createAnswer call and then call resolve or
              // reject based on the result of the original promise.
              if (key == 'createOffer' || key == 'createAnswer') {
                return new Promise(function(resolve, reject) {
                  func.apply(pc, argumentsList)
                    .then(result => {
                            trace(key + 'OnSuccess', pc._id, result);
                            resolve(result);
                          },
                          error => {
                            trace(key + 'OnFailure', pc._id, error.toString());
                            reject(error);
                          });
                });
              }
            }

            return func.apply(pc, argumentsList);
          }
        });
      }

      // Now that we've created a RTCPeerConnection and added listeners for
      // common events, we wrap the RTCPeerConnection in a proxy that tracks
      // get and set operations which includes getting functions to execute.
      // In the case of functions, we check whether we've created a proxy for
      // the particular function requested.  If we have a pre-existing proxy
      // for the function, we return it, otherwise we create one.
      return new Proxy(newPeerConn, {
        get(pc, key) {
          let member = pc[key];
          if (typeof member != "function") {
            traceProp(key, pc._id, member);
            return member;
          }

          // if we've already built a proxy for this method, use it
          // otherwise, build a new proxy for this method

          let memberProxy = pc._fnProxies[key] ||
                            (pc._fnProxies[key] = createProxyForMember(pc, key));
          return memberProxy;
        },

        set(pc, key, value) {
          // replace the existing proxy if overriding a function with an existing proxy
          // in the proxy, it will only trace the operation if it is the most recently
          // created proxy for the function
          if (pc._fnProxies[key]) {
            pc._fnProxies[key] = createProxyForMember(pc, key);
          }

          pc[key] = value;
          return true;
        }
      });
    }
  });

  // this section is courtesy of fippo's webrtc-externals, and allows us to
  // to track the arguments provided to getUserMedia and the results of the
  // operation. (see https://github.com/fippo/webrtc-externals)
  function dumpStream(stream) {
    return {
      id: stream.id,
      tracks: stream.getTracks().map(function(track) {
        return {
          id: track.id,                 // unique identifier (GUID) for the track
          kind: track.kind,             // `audio` or `video`
          label: track.label,           // identified the track source
          enabled: track.enabled,       // application can control it
          muted: track.muted,           // application cannot control it (read-only)
          readyState: track.readyState, // `live` or `ended`
        };
      }),
    };
  }

  var origGetUserMedia;
  var gum;
  if (navigator.getUserMedia) {
    origGetUserMedia = navigator.getUserMedia.bind(navigator);
    gum = function() {
      var id = Math.random().toString(36).substr(2, 10);
      traceGum('getUserMedia', id, arguments[0]);
      var cb = arguments[1];
      var eb = arguments[2];
      origGetUserMedia(arguments[0],
        function(stream) {
          // we log the stream id, track ids and tracks readystate since that is ended GUM fails
          // to acquire the cam (in chrome)
          traceGum('getUserMediaOnSuccess', id, dumpStream(stream));
          if (cb) {
            cb(stream);
          }
        },
        function(err) {
          traceGum('getUserMediaOnFailure', id, err.name);
          if (eb) {
            eb(err);
          }
        }
      );
    };
    navigator.getUserMedia = gum.bind(navigator);
  }

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    gum = function() {
      var id = Math.random().toString(36).substr(2, 10);
      traceGum('navigator.mediaDevices.getUserMedia', id, arguments[0]);
      return origGetUserMedia.apply(navigator.mediaDevices, arguments)
      .then(function(stream) {
        traceGum('navigator.mediaDevices.getUserMediaOnSuccess', id, dumpStream(stream));
        return stream;
      }, function(err) {
        traceGum('navigator.mediaDevices.getUserMediaOnFailure', id, err.name);
        return Promise.reject(err);
      });
    };
    navigator.mediaDevices.getUserMedia = gum.bind(navigator.mediaDevices);
  }
}+')();';

document.addEventListener('DOMContentLoaded', function() {
    var script = document.createElement('script');
    script.textContent = inject;
    (document.head||document.documentElement).appendChild(script);
    script.parentNode.removeChild(script);
});

if (typeof browser === 'undefined') {
    browser = chrome;
}

var pcChannel = browser.runtime.connect(null, { name : 'webrtc-pc-api' });
var gumChannel = browser.runtime.connect(null, { name : 'webrtc-gum-api' });

window.addEventListener('message', function (event) {
    if (typeof(event.data) === 'string') return;
    if (event.data[0] !== 'WebRTC-Func' &&
        event.data[0] !== 'WebRTC-Prop' &&
        event.data[0] !== 'WebRTC-Gum') return;
    if (event.data[0] === 'WebRTC-Gum') {
      gumChannel.postMessage({apiType: event.data[0],
                              pcId: event.data[1],
                              apiDate: new Date(),
                              apiMethod: event.data[2],
                              apiArgs: event.data[3]});
      return;
    }
    pcChannel.postMessage({apiType: event.data[0],
                           pcId: event.data[1],
                           apiDate: new Date(),
                           apiMethod: event.data[2],
                           apiArgs: event.data[3]});
});
