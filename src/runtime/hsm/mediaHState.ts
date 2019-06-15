import { HState } from './HSM';
import { EventType, CommandSequenceType, EventIntrinsicAction, CommandType } from '@brightsign/bscore';
import { ArEventType, HSMStateData } from '../../type/runtime';
import { DmcCommand, dmGetCommandSequenceIdForParentAndType, DmState, DmCommandSequence, dmGetCommandSequenceStateById, dmGetCommandById } from '@brightsign/bsdatamodel';
import { MediaZoneHSM } from './mediaZoneHSM';
import { getReduxStore, tmpGetVideoElementRef } from '../../index';
import { BsDmId } from '@brightsign/bsdatamodel';
import { DmMediaState, DmcEvent, DmcMediaState, dmGetEventIdsForMediaState, DmTimer, DmEvent, dmGetEventStateById, DmEventData, DmBpEventData, DmcTransition, DmCommandOperation } from '@brightsign/bsdatamodel';
import { isNil } from 'lodash';

export class MediaHState extends HState {

  mediaState: DmMediaState;

  timeoutInterval: number;
  timeout: any = null;

  // AUTOTRONTODO - check to see if event is disabled?

  eventDataMatches(matchedEvent: DmcEvent, dispatchedEvent: ArEventType): boolean {
    if (!isNil(matchedEvent.data)) {
      const eventData: DmEventData = matchedEvent.data;
      switch (matchedEvent.type) {
        case EventType.Bp: {
          const bpEventData: DmBpEventData = eventData as DmBpEventData;
          if ((bpEventData.bpIndex !== dispatchedEvent.EventData.bpIndex) ||
            (bpEventData.bpType !== dispatchedEvent.EventData.bpType) ||
            (bpEventData.buttonNumber !== dispatchedEvent.EventData.buttonNumber)) {
            return false;
          }
          break;
        }
        default: {
          console.log('no match');
        }
      }
    }
    return true;
  }

  getMatchedEvent(mediaState: DmMediaState, dispatchedEvent: ArEventType): DmcEvent | null {
    const mediaStateEvents: DmcEvent[] = (this.mediaState as DmcMediaState).eventList;
    for (const mediaStateEvent of mediaStateEvents) {
      if (mediaStateEvent.type === dispatchedEvent.EventType) {
        if (this.eventDataMatches(mediaStateEvent, dispatchedEvent)) {
          return mediaStateEvent;
        }
      }
    }
    return null;
  }

  // event is like transition in ExecuteTransition
  executeEventMatchAction(event: DmcEvent, stateData: HSMStateData): string {
    // AUTOTRONTODO - conditional transitions
    // AUTOTRONTODO - event.disabled

    if (isNil(event.transitionList) || event.transitionList.length === 0) {
      switch (event.action) {
        case EventIntrinsicAction.None: {
          console.log('remain on current state, playContinuous');
          return 'HANDLED';
        }
        case EventIntrinsicAction.ReturnToPriorState: {
          console.log('return prior state');
          /*
        nextStateId = ...previousStateId
        nextState = m.stateMachine.stateTable[nextState$]
        return 'TRANSITION'
          */
          return 'HANDLED';
        }
        case EventIntrinsicAction.StopPlayback: {
          console.log('remain on current state, stopPlayback');
          /*
			if type(m.stateMachine.videoPlayer) = 'roVideoPlayer' then
				m.stateMachine.videoPlayer.Stop()
			endif
          */
          return 'HANDLED';
        }
        case EventIntrinsicAction.StopPlaybackAndClearScreen: {
          console.log('remain on current state, stopPlaybackClearScreen');
          /*
			if type(m.stateMachine.videoPlayer) = 'roVideoPlayer' then
				m.stateMachine.videoPlayer.StopClear()
			endif
			if type(m.stateMachine.imagePlayer) = 'roImageWidget' then
				m.stateMachine.imagePlayer.StopDisplay()
      endif
          */
          return 'HANDLED';
        }
        default: {
          // AUTOTRONTODO
          debugger;
        }
      }
    }
    else {
      const transition: DmcTransition = event.transitionList[0]; // AUTOTRONTODO - or event.defaultTransition?
      console.log(transition);
      /*
    nextStateId = targetMediaStateId
    nextState = m.stateMachine.stateTable[nextState$]
      */
      // AUTOTRONTODO - any reason I can't do this?
      const targetMediaStateId: BsDmId = transition.targetMediaStateId;
      const zoneHSM: MediaZoneHSM = this.stateMachine as MediaZoneHSM;
      const targetHSMState: HState = zoneHSM.mediaStateIdToHState[targetMediaStateId];
      if (!isNil(targetHSMState)) {
        stateData.nextState = targetHSMState;
        return 'TRANSITION';
      }
    }

    // AUTOTRONTODO - should it ever do this?
    stateData.nextState = this.superState;
    return 'SUPER';
  }

  mediaHStateEventHandler(dispatchedEvent: ArEventType, stateData: HSMStateData): string {

    const matchedEvent: DmcEvent | null = this.getMatchedEvent(this.mediaState, dispatchedEvent);

    if (!isNil(matchedEvent)) {
      console.log(matchedEvent);

      // AUTOTRONTODO - anytime we don't want to do this? that is, should it be conditional
      // within executeEventMatchAction?
      this.executeTransitionCommands(matchedEvent);

      return this.executeEventMatchAction(matchedEvent, stateData);

      // AUTOTRONTODO - check for defaultTransition?
      // console.log('defaultTransition');
      // console.log(matchedEvent.defaultTransition);


      // AUTOTRONTODO - check transitionList
      // console.log('transitionList');
      // console.log(matchedEvent.transitionList);

      // AUTOTRONTODO - check action
      // console.log('action');
      // console.log(matchedEvent.action);

      // defaultTransition === null
      // transitionList === empty
      // action === null
      // => remain on current state, playContinuous

      // defaultTransition === null
      // transitionList === empty
      // action === StopPlayback
      // => remain on current state, stopPlayback

      // defaultTransition === null
      // transitionList === empty
      // action === StopPlaybackAndClearScreen
      // => remain on current state, stopPlaybackAndClearScreen

      // defaultTransition === a DmcTransition
      // transitionList === [the DmcTransition]
      // action === None
      // => transition using DmcTransition

    }
    // if (dispatchedEvent.EventType === 'Timer') {

    //   for (const event of mediaStateEvents) {
    //     if (event.type === EventType.Timer) {

    //       debugger;

    //       const transition: DmcTransition = event.defaultTransition as DmcTransition;
    //       const targetMediaStateId = transition.targetMediaStateId;

    //       console.log(targetMediaStateId);
    //       // TEDTODO - I assert that sourceMediaState === this.mediaState
    //       // const sourceMediaStateId = event.mediaStateId;
    //       // const sourceMediaState = mediaStatesById[sourceMediaStateId];

    //       // see autoplayGenerator.ts#getArTransitionFromDmcEvent


    //       // TEDTODO - validate that this timer is for this state
    //       return 'TRANSITION';
    //     }
    //   }
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

    const operations = command.operations;
    if (operations.length === 1) {

      const operation: DmCommandOperation = operations[0];
      console.log('CommandType');
      console.log(operation.type);

      switch (operation.type) {
        case CommandType.PauseVideo:
          console.log('pause');
          console.log(tmpGetVideoElementRef());
          tmpGetVideoElementRef().pause();
          break;
        case CommandType.ResumeVideo:
          console.log('play');
          console.log(tmpGetVideoElementRef());
          tmpGetVideoElementRef().play();
          break;
        default:
          break;
      }

    }
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

  executeTransitionCommands(event: DmcEvent) {

    console.log('execute transition commands');

    const reduxStore: any = getReduxStore();
    const bsdm: DmState = reduxStore.getState().bsdm;
    const sequenceId: BsDmId | null =
      dmGetCommandSequenceIdForParentAndType(bsdm, { id: event.id, type: CommandSequenceType.Event });
    if (!isNil(sequenceId)) {
      const sequence: DmCommandSequence | null = dmGetCommandSequenceStateById(bsdm, { id: sequenceId as string });
      if (isNil(sequence)) {
        return;
      }
      console.log('transition commands exist');
      const validatedSequence: DmCommandSequence = sequence as DmCommandSequence;
      for (const commandId of validatedSequence.sequence) {
        const command: DmcCommand | null = dmGetCommandById(bsdm, { id: commandId });
        if (!isNil(command)) {
          this.executeCommand(command, this.stateMachine as MediaZoneHSM);
        }
      }
    }
  }
}
