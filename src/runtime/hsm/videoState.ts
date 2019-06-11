import {
  CommandSequenceType,
} from '@brightsign/bscore';

import { DmState } from '@brightsign/bsdatamodel';
import { DmMediaState } from '@brightsign/bsdatamodel';

import { ZoneHSM } from "./zoneHSM";
import { MediaHState } from "./mediaHState";
import { HSMStateData, ArEventType } from "../../type/runtime";
import { MediaZoneHSM } from './mediaZoneHSM';

export default class VideoState extends MediaHState {

  bsdm: DmState;
  dispatch: Function;
  stateMachine: ZoneHSM;

  constructor(zoneHSM: ZoneHSM, mediaState: DmMediaState) {

    super(zoneHSM, mediaState.id);
    this.mediaState = mediaState;

    this.superState = zoneHSM.stTop;

    this.HStateEventHandler = this.STDisplayingVideoEventHandler;
  }

  STDisplayingVideoEventHandler(event: ArEventType, stateData: HSMStateData): string {

    stateData.nextState = null;

    if (event.EventType && event.EventType === 'ENTRY_SIGNAL') {
      console.log('entry signal');
      this.executeMediaStateCommands(this.mediaState.id, this.stateMachine as MediaZoneHSM, CommandSequenceType.StateEntry);
      this.launchTimer();
      return 'HANDLED';
    } else if (event.EventType && event.EventType === 'EXIT_SIGNAL') {
      this.mediaHStateExitHandler();
    } else {
      return this.mediaHStateEventHandler(event, stateData);
    }

    stateData.nextState = this.superState;
    return 'SUPER';
  }
}
