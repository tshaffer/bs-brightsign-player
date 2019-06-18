import { ZoneHSM } from './zoneHSM';
import { MediaHState } from './mediaHState';
import { DmMediaState } from '@brightsign/bsdatamodel';
import { HSMStateData, ArEventType } from '../../type/runtime';
import { CommandSequenceType } from '@brightsign/bscore';
import { MediaZoneHSM } from './mediaZoneHSM';

export default class ImageState extends MediaHState {

  stateMachine: ZoneHSM;

  constructor(zoneHSM: ZoneHSM, mediaState: DmMediaState) {
    super(zoneHSM, mediaState.id);

    this.mediaState = mediaState;

    this.superState = zoneHSM.stTop;

    this.HStateEventHandler = this.STDisplayingImageEventHandler;
  }

  STDisplayingImageEventHandler(event: ArEventType, stateData: HSMStateData): any {

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
