import * as React from 'react';

import { connect } from 'react-redux';
// import { bindActionCreators, Dispatch } from 'redux';

// import { DmState } from '@brightsign/bsdatamodel';

// import { postMessage } from '../store/stateMachine';

import { Sign } from './sign';
// import { ArState } from '../type/runtime';

// HACK
export let myApp = {};

class AppComponent extends React.Component<any, object> {

  state: object;

  constructor(props: object) {
    super(props);

    myApp = this;
  }

  render() {

    console.log('app render invoked');

    if (this.props.bsdm.zones.allZones.length === 0 ||
      Object.keys(this.props.activeMediaStates.activeMediaStateIdByZone).length === 0) {
      return (
        <div>
          Waiting for the presentation to be loaded...
        </div>
      );
    }

    // postMessage={this.props.postMessage}
    return (
      <Sign
        bsdm={this.props.bsdm}
      />
    );
  }
}

function mapStateToProps(state: any) {
  return {
    bsdm: state.bsdm,
    activeMediaStates: state.bsAutotron.activeMediaStates,
  };
}

export const App = connect(mapStateToProps, null)(AppComponent);
