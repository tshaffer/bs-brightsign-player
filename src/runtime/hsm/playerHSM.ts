import { HSM, HState, STTopEventHandler } from './HSM';
import { ArEventType, HSMStateData } from '../../type/runtime';

export class PlayerHSM extends HSM {

  type: string;
  stTop: HState;
  stPlayer: HState;
  stPlaying: HState;
  stWaiting: HState;

  startPlayback: () => void;
  restartPlayback: (presentationName: string) => Promise<void>;
  postMessage: (event: any) => void;

  constructor(
    startPlayback: () => void,
    restartPlayback: (presentationName: string) => Promise<void>,
    postMessage: (event: any) => void,
    dispatchEvent: any) {

    super(dispatchEvent);

    this.type = 'player';

    this.stTop = new HState(this, 'Top');
    this.stTop.HStateEventHandler = STTopEventHandler;

    // TEDTODO - who owns this??
    this.initialPseudoStateHandler = this.initializePlayerStateMachine;

    this.stPlayer = new STPlayer(this, 'Player', this.stTop);
    this.stPlaying = new STPlaying(this, 'Playing', this.stPlayer);
    this.stWaiting = new STWaiting(this, 'Waiting', this.stPlayer);

    this.topState = this.stTop;

    this.startPlayback = startPlayback;
    this.restartPlayback = restartPlayback;
    this.postMessage = postMessage;
  }

  // TEDTODO - args
  initializePlayerStateMachine(args: any): HState {

    console.log('initializePlayerStateMachine invoked');

    this.restartPlayback('').then(() => {
      // send event to cause transition to stPlaying
      const event = {
        EventType: 'TRANSITION_TO_PLAYING'
      };
      this.postMessage(event);
    });

    return this.stWaiting;
  }
}

class STPlayer extends HState {

  constructor(stateMachine: PlayerHSM, id: string, superState: HState) {

    super(stateMachine, id);

    this.HStateEventHandler = this.STPlayerEventHandler;
    this.superState = superState;
  }

  STPlayerEventHandler(event: ArEventType, stateData: HSMStateData): string {

    stateData.nextState = null;

    stateData.nextState = this.superState;
    return 'SUPER';
  }
}

class STPlaying extends HState {

  constructor(stateMachine: PlayerHSM, id: string, superState: HState) {
    super(stateMachine, id);

    this.HStateEventHandler = this.STPlayingEventHandler;
    this.superState = superState;
  }

  STPlayingEventHandler(event: ArEventType, stateData: HSMStateData): string {

    stateData.nextState = null;

    if (event.EventType && event.EventType === 'ENTRY_SIGNAL') {

      console.log(this.id + ': entry signal');

      // const stateMachine = this.stateMachine as PlayerHSM;

      // launch playback
      (this.stateMachine as PlayerHSM).startPlayback();

      return 'HANDLED';
    }

    stateData.nextState = this.superState;
    return 'SUPER';
  }
}

class STWaiting extends HState {

  constructor(stateMachine: PlayerHSM, id: string, superState: HState) {
    super(stateMachine, id);

    this.HStateEventHandler = this.STWaitingEventHandler;
    this.superState = superState;
  }

  STWaitingEventHandler(event: ArEventType, stateData: HSMStateData): string {

    stateData.nextState = null;

    if (event.EventType && event.EventType === 'ENTRY_SIGNAL') {
      console.log(this.id + ': entry signal');
      return 'HANDLED';
    } else if (event.EventType && event.EventType === 'TRANSITION_TO_PLAYING') {
      console.log(this.id + ': TRANSITION_TO_PLAYING event received');
      stateData.nextState = (this.stateMachine as PlayerHSM).stPlaying;
      return 'TRANSITION';
    }

    stateData.nextState = this.superState;
    return 'SUPER';
  }
}



