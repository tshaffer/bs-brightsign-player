import { HState } from "./HSM";
import { EventType, CommandSequenceType } from "@brightsign/bscore";
import { ArEventType, HSMStateData } from "../../type/runtime";
import { DmcCommand, dmGetCommandSequenceIdForParentAndType, DmState, DmCommandSequence, dmGetCommandSequenceStateById, dmGetCommandById } from '@brightsign/bsdatamodel';
import { MediaZoneHSM } from "./mediaZoneHSM";
import { getReduxStore } from "../../index";
import { BsDmId } from '@brightsign/bsdatamodel';
import { DmMediaState, DmcEvent, DmcMediaState, dmGetEventIdsForMediaState, DmTimer, DmEvent, dmGetEventStateById, DmcTransition } from '@brightsign/bsdatamodel';
import { isNil } from "lodash";

export class MediaHState extends HState {

  mediaState: DmMediaState;

  timeoutInterval: number;
  timeout: any = null;

  mediaHStateEventHandler(dispatchedEvent: ArEventType, stateData: HSMStateData): string {

    const eventList: DmcEvent[] = (this.mediaState as DmcMediaState).eventList;
    console.log('Event list for mediaState:');
    console.log(this.mediaState);
    console.log(eventList);
    
    if (dispatchedEvent.EventType === 'Timer') {

      for (const event of eventList) {
        if (event.type === EventType.Timer) {

          debugger;

          const transition: DmcTransition = event.defaultTransition as DmcTransition;
          const targetMediaStateId = transition.targetMediaStateId;

          console.log(targetMediaStateId);
          // TEDTODO - I assert that sourceMediaState === this.mediaState
          // const sourceMediaStateId = event.mediaStateId;
          // const sourceMediaState = mediaStatesById[sourceMediaStateId];
        
          // see autoplayGenerator.ts#getArTransitionFromDmcEvent


          // TEDTODO - validate that this timer is for this state
          return 'TRANSITION';
        }
      }
    }

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

  launchTimer(): void {
    
    // at least part of this will move somwhere else
    const reduxStore: any = getReduxStore();
    const bsdm: DmState = reduxStore.getState().bsdm;

    const eventIds: BsDmId[] = dmGetEventIdsForMediaState(bsdm, { id: this.id });
    for (const eventId of eventIds) {
      const event: DmEvent = dmGetEventStateById(bsdm, { id: eventId }) as DmEvent;
      if (event.type === EventType.Timer) {
        const interval: number = (event.data as DmTimer).interval;
        if (interval && interval > 0) {
          this.timeout = setTimeout(this.timeoutHandler, interval * 1000, this);
        }
      }
    }
  }

  timeoutHandler(mediaHState: MediaHState) {

    const event: ArEventType = {
      EventType: EventType.Timer,
    };

    const reduxStore: any = getReduxStore();
    reduxStore.dispatch(mediaHState.stateMachine.dispatchEvent(event));
  }

  executeCommand(command: DmcCommand, zoneHSM: MediaZoneHSM) {
    console.log('executeCommand:');
    console.log(command);
  }

  executeMediaStateCommands(mediaStateId: BsDmId, zoneHSM: MediaZoneHSM, commandSequenceType: CommandSequenceType) {
    const reduxStore: any = getReduxStore();
    const bsdm: DmState = reduxStore.getState().bsdm;
    const sequenceId: BsDmId | null =
      dmGetCommandSequenceIdForParentAndType(bsdm, { id: mediaStateId, type: commandSequenceType.toString() });
    if (!isNil(sequenceId)) {
      const sequence: DmCommandSequence | null = dmGetCommandSequenceStateById(bsdm, { id: sequenceId as string });
      if (isNil(sequence)) {
        return;
      }
      const validatedSequence: DmCommandSequence = sequence as DmCommandSequence;
      for (const commandId of validatedSequence.sequence) {
        const command: DmcCommand | null = dmGetCommandById(bsdm, { id: commandId });
        if (!isNil(command)) {
          this.executeCommand(command, zoneHSM);
        }
      }
    }
  }


}
