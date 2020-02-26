import { ZoneHSM } from './zoneHSM';
import { MediaHState } from './mediaHState';
import { DmMediaState } from '@brightsign/bsdatamodel';
import { HSMStateData, ArEventType } from '../../type/runtime';
import { CommandSequenceType } from '@brightsign/bscore';
import { MediaZoneHSM } from './mediaZoneHSM';
import { HState } from './HSM';
import { BsBspStringThunkAction, BsBspDispatch } from '../..';

export default class ImageState extends MediaHState {

  stateMachine: ZoneHSM;

  constructor(zoneHSM: ZoneHSM, mediaState: DmMediaState, superState: HState) {
    super(zoneHSM, mediaState.id);

    this.mediaState = mediaState;

    this.superState = superState;

    this.HStateEventHandler = this.STDisplayingImageEventHandler;
  }

  STDisplayingImageEventHandler(event: ArEventType, stateData: HSMStateData): BsBspStringThunkAction {

    return (dispatch: any) => {
      if (event.EventType === 'ENTRY_SIGNAL') {
        console.log(this.id + ': entry signal');
        dispatch(this.executeMediaStateCommands(this.mediaState.id, this.stateMachine as MediaZoneHSM, CommandSequenceType.StateEntry));
        dispatch(this.launchTimer());
        return 'HANDLED';
      } else if (event.EventType === 'EXIT_SIGNAL') {
        dispatch(this.mediaHStateExitHandler());
        stateData.nextState = this.superState;
        return 'SUPER';
      } else {
        return dispatch(this.mediaHStateEventHandler(event, stateData));
      }
    };
  }
}
