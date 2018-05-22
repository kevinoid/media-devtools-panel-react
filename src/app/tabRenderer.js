'use strict';

// LIBRARIES
import React from 'react';
import ReactDOM from 'react-dom';
// see https://github.com/pedronauck/react-simpletabs
import Tabs from 'react-simpletabs';

import WebrtcPanelDisplay from './webrtcRenderer';
import MediaPanelDisplay from './mediaRenderer';

class TabPanelDisplay extends React.Component {
  constructor(props) {
    super(props);

    this.handleBeforeChange = this.handleBeforeChange.bind(this);
    this.handleAfterChange = this.handleAfterChange.bind(this);
  }

  handleBeforeChange(selectedIndex, selectedPanel, selectedTabMenu) {
    // Stop the data updates if we're switching tabs.  Oddly, switching
    // tabs doesn't fire the componentWillUnMount message on the panels.
    this.refs.media === undefined || this.refs.media.cancelDataRequest();
    this.refs.webrtc === undefined || this.refs.webrtc.cancelDataRequest();

    // If we have a media tab, grab the state before it goes away so
    // that we can restore the state when the tab is shown again.
    if (this.refs.media !== undefined) {
      this.mediaState = this.refs.media.state;
    }
  }

  handleAfterChange(selectedIndex, selectedPanel, selectedTabMenu) {
    // If we are going to show the media tab, restore the saved state.
    if (this.refs.media !== undefined) {
      this.refs.media.state = this.mediaState;
    }
  }

  render() {
    return (
      <div>
      <Tabs onBeforeChange={this.handleBeforeChange}
            onAfterChange={this.handleAfterChange} >
        <Tabs.Panel title='Media'>
          <MediaPanelDisplay comms={this.props.comms} ref="media"/>
        </Tabs.Panel>
        <Tabs.Panel title='Webrtc'>
          <WebrtcPanelDisplay comms={this.props.comms} ref="webrtc"/>
        </Tabs.Panel>
      </Tabs>
      </div>
    );
  }
}


// EXPORT MODULE
const tabRenderer = {};
module.exports = tabRenderer;

const renderTabApp = (comms) => {
  ReactDOM.render(<TabPanelDisplay comms={comms} />,
                  document.getElementById('tabpanel'));
};

// rendering
tabRenderer.renderTabApp = renderTabApp;

