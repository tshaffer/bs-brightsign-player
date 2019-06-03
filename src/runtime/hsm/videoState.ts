import {
  EventType,
} from '@brightsign/bscore';

import {
  DmMediaState,
  DmState,
} from '@brightsign/bsdatamodel';
import { ZoneHSM } from "./zoneHSM";
import { MediaHState } from "./mediaHState";
import { HSMStateData, ArEventType } from "../../type/runtime";
import { setActiveMediaState } from "../../index";

export default class VideoState extends MediaHState {

  bsdm : DmState;
  dispatch : Function;
  stateMachine : ZoneHSM;

  constructor(zoneHSM : ZoneHSM, mediaState : DmMediaState) {

    super(zoneHSM, mediaState.id);
    this.mediaState = mediaState;

    this.superState = zoneHSM.stTop;

    this.HStateEventHandler = this.STDisplayingVideoEventHandler;
  }

  STDisplayingVideoEventHandler(event : ArEventType, stateData : HSMStateData) : string {

    stateData.nextState = null;

    if (event.EventType && event.EventType === 'ENTRY_SIGNAL') {
      console.log('entry signal');
      this.stateMachine.autotronStore.dispatch(setActiveMediaState(this.stateMachine.id, this.id));
      this.launchTimer();
      return 'HANDLED';
    } else if (event.EventType && event.EventType === 'EXIT_SIGNAL') {
      this.mediaHStateExitHandler();
    } else if (event.EventType === EventType.MediaEnd) {
      // const eventList : DmcEvent[] = (this.mediaState as DmcMediaState).eventList;
      const bsEventKey : string = this.getBsEventKey(event);
      if (this.eventLUT.hasOwnProperty(bsEventKey)) {
        stateData.nextState = this.eventLUT[bsEventKey];
        return 'TRANSITION';
      }
    } else {
      return this.mediaHStateEventHandler(event, stateData);
    }

    stateData.nextState = this.superState;
    return 'SUPER';
  }
}
