import { MediaHState } from './mediaHState';
import { ZoneHSM } from './zoneHSM';
import { DmMediaState } from '@brightsign/bsdatamodel';
import { ArEventType, HSMStateData } from '../../type/runtime';
import { MediaZoneHSM } from './mediaZoneHSM';
import { CommandSequenceType } from '@brightsign/bscore';
import { HState } from './HSM';

export default class SuperState extends MediaHState {
  
  constructor(zoneHSM: ZoneHSM, mediaState: DmMediaState, superState: HState) {

    super(zoneHSM, mediaState.id);
    this.mediaState = mediaState;

    this.superState = superState;

    this.HStateEventHandler = this.STDisplayingSuperStateEventHandler;
  }

  STDisplayingSuperStateEventHandler(event: ArEventType, stateData: HSMStateData): any {

    return (dispatch: any) => {
      if (event.EventType === 'ENTRY_SIGNAL') {
        console.log(this.id + ': entry signal');
        dispatch(this.executeMediaStateCommands(this.mediaState.id, this.stateMachine as MediaZoneHSM, CommandSequenceType.StateEntry));
        dispatch(this.launchTimer());
        return 'HANDLED';
      } else if (event.EventType === 'EXIT_SIGNAL') {
        dispatch(this.mediaHStateExitHandler());
      } else {
        return dispatch(this.mediaHStateEventHandler(event, stateData));
      }

      stateData.nextState = this.superState;
      return 'SUPER';
    };
  }
}
