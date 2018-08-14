'use strict';

// LIBRARIES
import React from 'react';
import ReactDOM from 'react-dom';
import ReactJson from 'react-json-view';
import { AutoSizer, Column, Table } from 'react-virtualized';
import ReactTable from 'react-table'; // from https://react-table.js.org
// The following import fails to parse.  Until I figure out why, I've
// copied the file into the extension directory and import in panel.html
// import 'react-table/react-table.css';

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


function FormatCreateOfferAnswerResponse(apiCall) {
  let key = apiCall['apiDate'] +
            " " + apiCall['apiMethod'];
  let val = "(" + apiCall['apiArgs'] + ")"; // in case we get an empty response

  let response = JSON.parse(apiCall['apiArgs']);
  if (Object.getOwnPropertyNames(response).length > 0) {
    val = response;
    response['sdp'] = response['sdp'].split("\r\n");
  }

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


function FormatGetStats(apiCall) {
  let args = JSON.parse(apiCall['apiArgs']);
  let key = apiCall['apiDate'] +
            " " + apiCall['apiMethod'];

  return [key, args];
}

function FormatWebRtcFunc(apiCall) {
  let key = undefined;
  let val = undefined;
  switch (apiCall['apiMethod']) {
    case 'createOfferOnSuccess':
    case 'createAnswerOnSuccess':
      [key, val] = FormatCreateOfferAnswerResponse(apiCall);
      break;
    case 'setLocalDescription':
    case 'setRemoteDescription':
      [key, val] = FormatSetDescription(apiCall);
      break;
    case 'getStats':
      [key, val] = FormatGetStats(apiCall);
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
    let creationDate = pc['apiCalls'][0]['apiDate'] || "no date";
    let pcLabel = "PeerConnection " + key + " - " + creationDate;
    pc['apiCalls'] = FormatApiCalls(pc['apiCalls']);
    pc['id'] = key;
    pc['date'] = creationDate;
    pc['name'] = "PeerConnection";
    out[pcLabel] = pc;
  });

  Object.keys(gums).map(key => {
    let gum = gums[key];
    let creationDate = gum['apiCalls'][0]['apiDate'] || "no date";
    let gumLabel = "GUM " + key + " - " + creationDate;
    gum['apiCalls'] = FormatApiCalls(gum['apiCalls']);
    gum['id'] = key;
    gum['date'] = creationDate;
    gum['name'] = "GUM";
    out[gumLabel] = gum;
  });

  return out;
}


class ApiCalls extends React.Component {
  constructor(props) {
    super(props);
    this.expanded = false;
  }

  render() {
   if (this.props.expandAll !== undefined) {
     this.expanded = this.props.expandAll;
   }

    return(
      <ReactJson src={ this.props.data }
                 name={ this.props.name }
                 collapsed={!this.expanded}
                 displayObjectSize={false}
                 displayDataTypes={false}
                 enableClipboard={false} />);
  }
}


function PeerConnectionDetails(props) {
  let rowId = props.rowId;
  let apiCalls = props.apiCalls;
  let candidatePairs = props.candidatePairs;
  let rtpRtcpStreams = props.rtpRtcpStreams;

  return (
    <div>
      <em>
        API info for PeerConnection {rowId}.
      </em>
      <br />
      <br />
      <ApiCalls data={apiCalls} name={rowId} expandAll={props.expandAll} />
      <br />
      <br />
      <em>
        Candidate pair info for PeerConnection {rowId}
      </em>
      <br />
      <br />
      <CandidatePairTable data={candidatePairs} name={rowId}/>
      <br />
      <br />
      <em>
        RTP/RTCP stream info for PeerConnection {rowId}
      </em>
      <br />
      <br />
      <RtpRtcpStreamTable data={rtpRtcpStreams} name={rowId}/>
    </div>
  );
}


function GumDetails(props) {
  let rowId = props.rowId;
  let apiCalls = props.apiCalls;

  return (
    <div>
      <em>
        API info for GUM {rowId}.
      </em>
      <br />
      <br />
      <ApiCalls data={apiCalls} name={rowId} expandAll={props.expandAll}/>
    </div>
  );
}


class PeerConnTable extends React.Component {
  constructor(props) {
    super(props);
    this.expandedElements = {};
    this.pageSize = 5;
  }

  render() {
    const columns = [
      {
        Header: "Creation Date",
        accessor: "date",
        width: 240
      },
      {
        Header: "ID",
        accessor: "id",
        width: 120
      },
      {
        Header: "Name",
        accessor: "name"
      }
    ];

    if (this.props.expandAll !== undefined) {
      if (this.props.expandAll) {
        this.props.rowData.map((obj, index) => {this.expandedElements[index] = {}});
        this.pageSize = this.props.rowData.length;
      } else {
        this.expandedElements = {};
        this.pageSize = 5;
      }
    }

    return(
        <ReactTable
          columns={columns}
          defaultSorted={[{id:"date", desc: true}]}
          collapseOnSortingChange={false}
          collapseOnPageChange={false}
          collapseOnDataChange={false}
          expanded={this.expandedElements}
          pageSize={this.pageSize}
          onExpandedChange={expanded => {
            this.expandedElements = expanded;
            this.forceUpdate();
          }}
          onPageSizeChange={(pageSize, pageIndex) => {
            this.pageSize = pageSize;
            this.forceUpdate();
          }}
          defaultPageSize={5}
          className="-striped -highlight"
          SubComponent={row => {
            let rowId = row["original"]["id"];
            let apiCalls = row["original"]["apiCalls"];
            let candidatePairs = this.props.candidatePairs[rowId];
            let rtpRtcpStreams = this.props.rtpRtcpStreams[rowId];
            return (
              <div style={{ padding: "20px" }}>
                {row["original"]["name"] === "GUM"
                 ? <GumDetails rowId={rowId} apiCalls={apiCalls} expandAll={this.props.expandAll}/>
                 : <PeerConnectionDetails rowId={rowId}
                                          apiCalls={apiCalls}
                                          expandAll={this.props.expandAll}
                                          candidatePairs={candidatePairs}
                                          rtpRtcpStreams={rtpRtcpStreams} />
                }
              </div>
            );
          }}
          data={this.props.rowData}
        />
    );
  }
}


function CandidatePairTable(props) {
  let list = props.data || [];
  // always leave room for the header and at least one row, but not more than 9
  let headerHeight = 35;
  let rowHeight = 30;
  let tableHeight = headerHeight
                    + (rowHeight * (1 + (Math.min(list.length, 9))));

  return (
    <div>
      <AutoSizer disableHeight>
        {({ width }) => (
        <Table width={width * .99}
               height={tableHeight}
               headerHeight={headerHeight}
               headerStyle={{textTransform: 'none'}} // defaults to all caps
               rowHeight={rowHeight}
               rowCount={list.length}
               rowGetter={({ index }) => list[index]}
               rowStyle={{borderBottom:'1px solid #e0e0e0'}}
          >
          <Column width={width * .10}
                  label='Pair'
                  dataKey='id'
          />
          <Column width={width * .10}
                  label='Bytes Tx'
                  dataKey='bytesTx'
          />
          <Column width={width * .10}
                  label='Bytes Rx'
                  dataKey='bytesRx'
          />
          <Column width={width * .35}
                  label='Local'
                  dataKey='localCand'
          />
          <Column width={width * .34}
                  label='Remote'
                  dataKey='remoteCand'
          />
        </Table>
        )}
      </AutoSizer>
    </div>);
}


function RtpRtcpStreamTable(props) {
  let list = props.data || [];
  // always leave room for the header and at least one row, but not more than 9
  let headerHeight = 35;
  let rowHeight = 30;
  let tableHeight = headerHeight
                    + (rowHeight * (1 + (Math.min(list.length, 9))));

  return (
    <div>
      <AutoSizer disableHeight>
        {({ width }) => (
        <Table width={width * .99}
               height={tableHeight}
               headerHeight={headerHeight}
               headerStyle={{textTransform: 'none'}} // defaults to all caps
               rowHeight={rowHeight}
               rowCount={list.length}
               rowGetter={({ index }) => list[index]}
               rowStyle={{borderBottom:'1px solid #e0e0e0'}}
          >
          <Column width={width * .10}
                  label='Media Type'
                  dataKey='mediaType'
          />
          <Column width={width * .15}
                  label='SSRC'
                  dataKey='ssrc'
          />
          <Column width={width * .10}
                  label='Bytes Tx'
                  dataKey='bytesTx'
          />
          <Column width={width * .10}
                  label='Packets Tx'
                  dataKey='pktsTx'
          />
          <Column width={width * .10}
                  label='Bytes Rx'
                  dataKey='bytesRx'
          />
          <Column width={width * .10}
                  label='Packets Rx'
                  dataKey='pktsRx'
          />
          <Column width={width * .10}
                  label='Packets Lost'
                  dataKey='pktsLost'
          />
        </Table>
        )}
      </AutoSizer>
    </div>);
}


class WebrtcPanelDisplay extends React.Component {
  constructor(props) {
    super(props);

    this.state = {data:"",
                  refreshCnt:0};

    this.refreshNumber = 0;
    this.saveRequested = false;

    // This binding is necessary to make `this` work in callbacks
    this.clearData = this.clearData.bind(this);
    this.saveData = this.saveData.bind(this);
    this.expandAll = this.expandAll.bind(this);
    this.collapseAll = this.collapseAll.bind(this);
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
                   candidatePairs:returnedData['candidatePairs'],
                   rtpRtcpStreams:returnedData['rtpRtcpStreams'],
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
    if (this.saveRequested) {
      this.saveRequested = false;
      this.props.comms.SaveWebrtc(this._pcsToSave.outerHTML);
    }

    if (this.state.expandAllElements !== undefined) {
      this.setState({expandAllElements: undefined});
      this.forceUpdate();
    }
  }

  clearData() {
    this.props.comms.ClearWebrtc();
    // reset the local data so clear history button's action is obvious while
    // we wait for the next regularly scheduled data request.
    this.setState({data:{},
                   candidatePairs:{},
                   rtpRtcpStreams:{},
                   refreshCnt:this.refreshNumber});
  }

  collapseAll() {
    this.setState({expandAllElements: false});
  }

  expandAll() {
    this.setState({expandAllElements: true});
  }

  saveData() {
    // expanding here doesn't seem to work - it causes some of the
    // sub-tables (like the candidate pair table to not render in the
    // saved html).  Expanding manually before save works though.
    this.saveRequested = true;
    this.forceUpdate();
  }

  render() {
    let refreshCnt = this.state.refreshCnt;
    let peerConns = this.state.data;
    let candidatePairs = this.state.candidatePairs || {};
    let rtpRtcpStreams = this.state.rtpRtcpStreams || {};
    let propsDataArr = Object.keys(peerConns).map(key => peerConns[key]);

    return (
      <div width="100%" height="100%" >
        <input type="button" value="Clear History" onClick={this.clearData} />
        <input type="button" value="Collapse All" onClick={this.collapseAll} />
        <input type="button" value="Expand All" onClick={this.expandAll} />
        <input type="button" value="Save" onClick={this.saveData} />
        please expand all before using save
        <h3>WebRTC Info (refresh cnt { refreshCnt })</h3>
        <div ref={(pcsToSave) => this._pcsToSave = pcsToSave}>
          <PeerConnTable rowData={ propsDataArr }
                         expandAll={ this.state.expandAllElements }
                         candidatePairs={ candidatePairs }
                         rtpRtcpStreams={ rtpRtcpStreams } />
        </div>
      </div>
    );
  }
}


// EXPORT MODULE
module.exports = WebrtcPanelDisplay;
