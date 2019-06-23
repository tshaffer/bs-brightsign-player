import * as React from 'react';

import { connect } from 'react-redux';
// import { bindActionCreators, Dispatch } from 'redux';

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

  componentWillMount() {
    document.addEventListener('keydown', this.onKeyPressed.bind(this));
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyPressed.bind(this));
  }

  onKeyPressed(e: any) {
    console.log(e.keyCode);
  }

  render() {

    // not sure about this check
    if (this.props.bsdm.zones.allZones.length === 0 ||
      Object.keys(this.props.activeHStates).length === 0) {
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
    activeHStates: state.bsPlayer.activeHStates,
  };
}

export const App = connect(mapStateToProps, null)(AppComponent);
