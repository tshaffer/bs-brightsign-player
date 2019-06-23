import {
  CommandSequenceType,
} from '@brightsign/bscore';

import { DmMediaState } from '@brightsign/bsdatamodel';

import { ZoneHSM } from './zoneHSM';
import { MediaHState } from './mediaHState';
import { HSMStateData, ArEventType } from '../../type/runtime';
import { MediaZoneHSM } from './mediaZoneHSM';

export default class VideoState extends MediaHState {

  constructor(zoneHSM: ZoneHSM, mediaState: DmMediaState) {

    super(zoneHSM, mediaState.id);
    this.mediaState = mediaState;

    this.superState = zoneHSM.stTop;

    this.HStateEventHandler = this.STDisplayingVideoEventHandler;
  }

  STDisplayingVideoEventHandler(event: ArEventType, stateData: HSMStateData): any {

    return (dispatch: any) => {
      stateData.nextState = null;

      if (event.EventType && event.EventType === 'ENTRY_SIGNAL') {
        console.log(this.id + ': entry signal');
        dispatch(this.executeMediaStateCommands(this.mediaState.id, this.stateMachine as MediaZoneHSM, CommandSequenceType.StateEntry));
        dispatch(this.launchTimer());
        return 'HANDLED';
      } else if (event.EventType && event.EventType === 'EXIT_SIGNAL') {
        dispatch(this.mediaHStateExitHandler());
      } else {
        return dispatch(this.mediaHStateEventHandler(event, stateData));
      }

      stateData.nextState = this.superState;
      return 'SUPER';
    };
  }
}
