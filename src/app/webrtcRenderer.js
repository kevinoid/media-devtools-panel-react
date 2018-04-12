'use strict';

// LIBRARIES
import React from 'react';
import ReactDOM from 'react-dom';
import ReactJson from 'react-json-view';
import { AutoSizer, Column, Table } from 'react-virtualized';


class TextInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {value: props.value || ""};
    this.handleChange = this.handleChange.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }
  handleChange(event) {
    let newValue = event.target.value;
    this.setState({value: newValue});
    this.props.onChange(this.props.name, newValue);
  }
  onKeyDown(event) {
    if (event.keyCode === 27) {
      event.preventDefault();
      this.setState({value: ""});
      this.props.onChange(this.props.name, "");
    }
  }
  render() {
    return (
      <label>
        {this.props.label + ": "}
        <input type="text" value={this.state.value} onChange={this.handleChange} onKeyDown={this.onKeyDown} />
      </label>);
  }
}

class CheckboxInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {checked: props.checked || false};
    this.handleChange = this.handleChange.bind(this);
  }
  handleChange(event) {
    let newChecked = event.target.checked;
    this.setState({checked: newChecked});
    this.props.onChange(this.props.name, newChecked);
  }
  render() {
    return (
      <label>
        <input type="checkbox" checked={this.state.checked} onChange={this.handleChange} />
        {this.props.label}
      </label>);
  }
}

function RadioInput(props) {
  return (
    <label>
      <input type="radio" checked={props.selected} onChange={props.onChange} />
      {props.label}
    </label>);
}


function FormatDefaultApiCall(apiCall) {
  let key = apiCall['apiDate'] +
            " " + apiCall['apiMethod'];
  let val = "(" + apiCall['apiArgs'] + ")";
  return [key, val];
}


function FormatSetDescription(apiCall) {
  let args = JSON.parse(apiCall['apiArgs'])[0];
  let key = apiCall['apiDate'] +
            " " + apiCall['apiMethod'] +
            " (" + args['type'] + ")";
  let val = args;

  // split the sdp string at the eol chars and build an array of lines
  args['sdp'] = args['sdp'].split("\r\n");

  return [key, val];
}


function FormatWebRtcFunc(apiCall) {
  let key = undefined;
  let val = undefined;
  switch (apiCall['apiMethod']) {
    case 'setLocalDescription':
    case 'setRemoteDescription':
      [key, val] = FormatSetDescription(apiCall);
      break;
    default:
      [key, val] = FormatDefaultApiCall(apiCall);
  }
  return [key, val];
}


function FixKeyCollision(props) {
  let key = props.key;
  let collisionCnt = props.collisionCnt;

  if (collisionCnt) {
    return key + " (" + collisionCnt + ")";
  }

  return key;
}

function FormatApiCalls(apiCalls) {
  let out = {};
  let lastKey = "";
  let collisionCnt = 0;
  let key = undefined;
  let val = undefined;

  apiCalls.map(call => {
    switch (call['apiType']) {
      case 'WebRTC-Prop':
        key = call['apiDate'] + " - get " +
                      " " + call['apiMethod'];
        val = call['apiArgs'];
        break;
      case 'WebRTC-Func':
        [key, val] = FormatWebRtcFunc(call);
        break;
      default:
        [key, val] = FormatDefaultApiCall(call);
    }
    if (lastKey == key) {
      collisionCnt++
    } else {
      collisionCnt = 0;
    }
    lastKey = key; // keep the unmodified key for comparison
    key = FixKeyCollision({key: key, collisionCnt: collisionCnt});
    out[key] = val;
  });

  return out;
}


function FormatData(data) {
  let peerConns = data['peerConns'];
  let gums = data['gums'];
  let out = {};

  Object.keys(peerConns).map(key => {
    let pc = peerConns[key];
    let creationDate = " - " + (pc['apiCalls'][0]['apiDate'] || "no date");
    let pcLabel = "PeerConnection " + key + creationDate;
    pc['apiCalls'] = FormatApiCalls(pc['apiCalls']);
    out[pcLabel] = pc;
  });

  Object.keys(gums).map(key => {
    let gum = gums[key];
    let creationDate = " - " + (gum['apiCalls'][0]['apiDate'] || "no date");
    let gumLabel = "GUM " + key + creationDate;
    gum['apiCalls'] = FormatApiCalls(gum['apiCalls']);
    out[gumLabel] = gum;
  });

  return out;
}

function PeerConnCurrentState(props) {
  return(
    <ReactJson src={ props.data }
               name={ props.name }
               collapsed={true}
               displayObjectSize={false}
               displayDataTypes={false}
               enableClipboard={false} />);
}


function PeerConnections(props) {
  return (
    <div>
      {Object.keys(props.data).length
       ? Object.keys(props.data).map(
           key => <PeerConnCurrentState data={props.data[key]}
                                           name={key} />)
       : "no peer connections"
      }
    </div>);
}


function TopBar(props) {
  return (
    <div>
      <h3>WebRTC Panel (refresh cnt {props.refreshCnt})</h3>
      <PeerConnections data={ props.data } />
    </div>);
}


class WebrtcPanelDisplay extends React.Component {
  constructor(props) {
    super(props);

    this.state = {data:"",
                  refreshCnt:0};

    this.refreshNumber = 0;
  }

  requestData() {
    this.refreshNumber++;
    // Keep a reference to 'this', as it's hidden from then/catch functions.
    let self = this;

    this.props.comms.GetWebrtc().then(function(data) {
      if (self.timerId === null) {
        return;
      }
      // need to call a method on self to have access to fields on 'this'
      self.gotData(data);
    }).catch(function(reason) {
      console.log(`Failed to get data: ${reason.toString()}`);
      self.requestDataLater();
    });
  }

  gotData(returnedData) {
    // need to use setState to have changes register to be displayed
    this.setState({data:FormatData(returnedData),
                   refreshCnt:this.refreshNumber});
    this.requestDataLater();
  }

  requestDataLater() {
    this.timerId = setTimeout(() => this.requestData(), 6000);
  }

  cancelDataRequest() {
    clearTimeout(this.timerId);
    this.timerId = null;
  }

  componentDidMount() {
    // start the refresh loop
    this.requestData();
  }

  componentWillUnMount() {
    cancelDataRequest();
  }

  componentWillUpdate() {
//     this.updateStart = Date.now();
  }

  componentDidUpdate() {
//     console.log(`componentDidUpdate() after ${Date.now() - this.updateStart}ms`);
  }

  render() {
    return (
      <div width="100%" height="100%" >
        <TopBar data={this.state.data}
                refreshCnt={this.state.refreshCnt} />
      </div>
    );
  }
}


// EXPORT MODULE
const webrtcRenderer = {};
module.exports = webrtcRenderer;

const renderWebrtcApp = (comms) => {
  ReactDOM.render(<WebrtcPanelDisplay comms={comms} />,
                  document.getElementById('webrtcpanel'));
};

// rendering
webrtcRenderer.renderWebrtcApp = renderWebrtcApp;

