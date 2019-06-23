import * as React from 'react';

import { connect } from 'react-redux';

import { Sign } from './sign';
import { Dispatch, bindActionCreators } from 'redux';
import { processKeyPress } from '../controller/device/player';
import { DmState } from '@brightsign/bsdatamodel';

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

export interface AppProps {
  bsdm: DmState;
  activeHStates: any;
  onKeyPress: (key: any) => void;
}

// -----------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------

// HACK
export let myApp = {};

class AppComponent extends React.Component<AppProps> {

  state: object;

  constructor(props: AppProps) {
    super(props);

    myApp = this;

    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  componentWillMount() {
    document.addEventListener('keydown', this.handleKeyPress);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyPress);
  }

  handleKeyPress(e: any) {
    console.log('keyCode');
    console.log(e.keyCode);

    console.log('target tag name');
    console.log(e.target.tagName);

    console.log('key');
    console.log(e.key);

    console.log('metaKey');
    console.log(e.metaKey);

    console.log('shiftKey');
    console.log(e.shiftKey);

    console.log('ctrlKey');
    console.log(e.ctrlKey);

    this.props.onKeyPress(e.key);
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

// -----------------------------------------------------------------------
// Container
// -----------------------------------------------------------------------

const mapDispatchToProps = (dispatch: Dispatch<any>) => {
  return bindActionCreators({
    onKeyPress: processKeyPress,
  }, dispatch);
};

function mapStateToProps(state: any) {
  return {
    bsdm: state.bsdm,
    activeHStates: state.bsPlayer.activeHStates,
  };
}

export const App = connect(mapStateToProps, mapDispatchToProps)(AppComponent);
