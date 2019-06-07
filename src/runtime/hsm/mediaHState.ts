import { HState } from "./HSM";
import { EventType } from "@brightsign/bscore";
import { ArEventType, HSMStateData, SubscribedEvents } from "../../type/runtime";
import { DmEvent } from '@brightsign/bsdatamodel';
import { DmTimer, DmcTransition, dmGetTransitionById, dmGetTransitionIdsForEvent, dmGetEventStateById } from "@brightsign/bsdatamodel";
import { MediaZoneHSM } from "./mediaZoneHSM";
import { ZoneHSM } from "./zoneHSM";
import { getReduxStore } from "../../index";
// import { dispatchPostMessage } from "../../index";
import { BsDmId } from '@brightsign/bsdatamodel';
import { DmMediaState } from '@brightsign/bsdatamodel';

export class MediaHState extends HState {

  mediaState: DmMediaState;

  eventLUT: SubscribedEvents = {};
  timeoutInterval: number;
  timeout: any = null;

  addEvents(zoneHSM: ZoneHSM, eventIds: BsDmId[]) {

    eventIds.forEach((eventId: BsDmId) => {

      // generate eventKey
      const event: DmEvent = dmGetEventStateById(zoneHSM.autotronStore.getState().bsdm, { id: eventId }) as DmEvent;
      const eventKey: string = this.getHStateEventKey(event);

      // not sure best way to do this, so do it this way for now
      if (event.type === EventType.Timer) {
        const interval: number = (event.data as DmTimer).interval;
        this.timeoutInterval = interval;
      }
      // get transition
      const transitionIds: BsDmId[] = dmGetTransitionIdsForEvent(zoneHSM.autotronStore.getState().bsdm, { id: event.id });
      // TODO - only support a single transition per event for now
      if (transitionIds.length !== 1) {
        debugger;
      }
      const transition: DmcTransition = dmGetTransitionById(zoneHSM.autotronStore.getState().bsdm, { id: transitionIds[0] }) as DmcTransition;

      // TODO - limited functionality at the moment
      const targetMediaStateId = transition.targetMediaStateId;

      // TODO - may be bogus
      const mediaZoneHSM: MediaZoneHSM = zoneHSM as MediaZoneHSM;

      // TODO - use a function - don't use LUT directly
      const targetMediaHState: HState = mediaZoneHSM.mediaStateIdToHState[targetMediaStateId];
      this.eventLUT[eventKey] = targetMediaHState;
    });
  }

  mediaHStateEventHandler(event: ArEventType, stateData: HSMStateData): string {

    // iterate through the events for which this state has transitions - if any match the supplied event,
    // execute the associated transition

    // const eventList : DmcEvent[] = (this.mediaState as DmcMediaState).eventList;

    // for (let stateEvent of eventList) {
    const bsEventKey: string = this.getBsEventKey(event);
    // TODO - hack to workaround unfinished code
    if (bsEventKey !== '') {
      if (this.eventLUT.hasOwnProperty(bsEventKey)) {
        stateData.nextState = this.eventLUT[bsEventKey];
        return 'TRANSITION';
      }
    }
    // }

    stateData.nextState = this.superState;
    return 'SUPER';
  }


  mediaHStateExitHandler(): void {
    console.log(this.id + ': exit signal');
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }


  getBsEventKey(bsEvent: ArEventType): string {

    let bsEventKey: string = '';

    switch (bsEvent.EventType) {
      case EventType.Bp: {
        bsEventKey = bsEvent.EventData.ButtonPanelName + '-' + bsEvent.EventData.ButtonIndex.toString();
        break;
      }
      case EventType.Timer: {
        bsEventKey = 'timer-' + this.id;
        break;
      }
      case EventType.MediaEnd: {
        bsEventKey = 'mediaEnd-' + this.id;
        break;
      }
      default: {
        break;
      }
    };

    return bsEventKey;
  }


  getHStateEventKey(event: DmEvent): string {

    let eventKey: string = '';

    console.log('getHState, event type is: ' + event.type);

    switch (event.type) {
      case EventType.Timer: {
        // const eventData : DmTimer = event.data as DmTimer;
        eventKey = 'timer-' + this.id;
        break;
      }
      case EventType.MediaEnd: {
        eventKey = 'mediaEnd-' + this.id;
        break;
      }
    }

    return eventKey;
  }

  launchTimer(): void {
    if (this.timeoutInterval && this.timeoutInterval > 0) {
      this.timeout = setTimeout(this.timeoutHandler, this.timeoutInterval * 1000, this);
    }
  }

  timeoutHandler(mediaHState: MediaHState) {
    mediaHState.timeout = null;
    const eventKey: string = 'timer-' + mediaHState.id;
    if (mediaHState.eventLUT.hasOwnProperty(eventKey)) {
      // const targetHState : HState = mediaHState.eventLUT[eventKey];

      const event: ArEventType = {
        EventType: EventType.Timer,
      };

      const reduxStore: any = getReduxStore();
      reduxStore.dispatch(mediaHState.stateMachine.dispatchEvent(event));
      // dispatchPostMessage(event);
    }
  }

}
