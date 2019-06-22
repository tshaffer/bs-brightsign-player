import { HState } from './HSM';
import { EventType, CommandSequenceType, EventIntrinsicAction, CommandType } from '@brightsign/bscore';
import { ArEventType, HSMStateData } from '../../type/runtime';
import { DmcCommand, dmGetCommandSequenceIdForParentAndType, DmState, DmCommandSequence, dmGetCommandSequenceStateById, dmGetCommandById, DmCommandData, DmMessageCommandData, 
  DmZoneMessageEventData, DmParameterizedString, dmGetSimpleStringFromParameterizedString, DmBpOutputCommandData } from '@brightsign/bsdatamodel';
import { MediaZoneHSM } from './mediaZoneHSM';
import { getReduxStore, tmpGetVideoElementRef, dispatchHsmEvent, tmpGetVideoElementSourceRef } from '../../index';
import { BsDmId } from '@brightsign/bsdatamodel';
import { DmMediaState, DmcEvent, DmcMediaState, dmGetEventIdsForMediaState, DmTimer, DmEvent, dmGetEventStateById, DmEventData, DmBpEventData, DmcTransition, DmCommandOperation } from '@brightsign/bsdatamodel';
import { isNil } from 'lodash';

import { setBpOutput } from '../device/bp';

export class MediaHState extends HState {

  mediaState: DmMediaState;

  timeoutInterval: number;
  timeout: any = null;

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
        case EventType.ZoneMessage: {
          const zoneMessageData: DmZoneMessageEventData = eventData as DmZoneMessageEventData;
          const dispatchedZoneMessagePS: DmParameterizedString = dispatchedEvent.EventData.zoneMessage.messageData as DmParameterizedString;
          const dispatchedString: string = dmGetSimpleStringFromParameterizedString(dispatchedZoneMessagePS) as string;
          if (zoneMessageData.data !== dispatchedString) {
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

  // event here is like the transition parameter in ExecuteTransition
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
          tmpGetVideoElementRef().pause();
          return 'HANDLED';
        }
        case EventIntrinsicAction.StopPlaybackAndClearScreen: {
          console.log('remain on current state, stopPlaybackClearScreen');
          // videoPlayer.StopClear()
          // imagePlayer.StopDisplay()
          tmpGetVideoElementRef().pause();
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
      const targetMediaStateId: BsDmId = transition.targetMediaStateId;
      const zoneHSM: MediaZoneHSM = this.stateMachine as MediaZoneHSM;
      const targetHSMState: HState = zoneHSM.mediaStateIdToHState[targetMediaStateId];
      if (!isNil(targetHSMState)) {
        stateData.nextState = targetHSMState;
        return 'TRANSITION';
      }
    }

    // AUTOTRONTODO - should it ever reach here?
    stateData.nextState = this.superState;
    return 'SUPER';
  }

  mediaHStateEventHandler(dispatchedEvent: ArEventType, stateData: HSMStateData): any {

    return (dispatch: any) => {

      const matchedEvent: DmcEvent | null = this.getMatchedEvent(this.mediaState, dispatchedEvent);

      if (!isNil(matchedEvent)) {

        // AUTOTRONTODO - anytime we don't want to do this? that is, should it be conditional
        // within executeEventMatchAction?
        dispatch(this.executeTransitionCommands(matchedEvent));

        return this.executeEventMatchAction(matchedEvent, stateData);
      }

      stateData.nextState = this.superState;
      return 'SUPER';
    };
  }

  mediaHStateExitHandler(): any {
    return (dispatch: any) => {

      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }
      dispatch(this.executeMediaStateCommands(this.mediaState.id, this.stateMachine as MediaZoneHSM, CommandSequenceType.StateExit));
    };

  }

  launchTimer(): any {

    return (dispatch: any, getState: any) => {

      // at least part of this will move somwhere else
      const bsdm: DmState = getState().bsdm;

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
    };
  }

  timeoutHandler(mediaHState: MediaHState) {

    const event: ArEventType = {
      EventType: EventType.Timer,
    };

    const reduxStore: any = getReduxStore();
    reduxStore.dispatch(mediaHState.stateMachine.dispatchEvent(event));
  }

  executePauseVideoCommand() {
    console.log('pause video');
    tmpGetVideoElementRef().pause();

    const videoElementRef = tmpGetVideoElementRef();
    console.log('videoElementRef');
    console.log(videoElementRef);
    console.log('set source to null');
    videoElementRef.setAttribute('src', null);
    const src = videoElementRef.getAttribute('src');
    console.log('src');
    console.log(src);
    videoElementRef.removeAttribute('src');
    
    // console.log('get assetPlayerSource');
    // const assetPlayerSource: any = tmpGetVideoElementSourceRef();
    // console.log('assetPlayerSource:');
    // console.log(assetPlayerSource);
    // assetPlayerSource.removeAttribute('src');
  }

  executeResumeVideoCommand() {
    tmpGetVideoElementRef().play();
  }

  executeSendZoneMessage(operation: DmCommandOperation) {
    return (dispatch: any) => {

      console.log(operation);
      const commandData: DmCommandData = operation.data as DmCommandData;
      const zoneMessage: DmMessageCommandData = commandData as DmMessageCommandData;
      const event: ArEventType = {
        EventType: EventType.ZoneMessage,
        EventData: {
          zoneMessage,
        }
      };

      const action: any = dispatchHsmEvent(event);
      dispatch(action);
    };
  }

  executeSendBpOutput(operation: DmCommandOperation) {
    const bpOutputCommandData: DmBpOutputCommandData = operation.data as DmBpOutputCommandData;
    setBpOutput(bpOutputCommandData);
  }

  executeCommand(command: DmcCommand, zoneHSM: MediaZoneHSM) {
    return (dispatch: any) => {

      console.log('executeCommand:');

      const operations = command.operations;
      if (operations.length === 1) {

        const operation: DmCommandOperation = operations[0];
        console.log('CommandType');
        console.log(operation.type);

        switch (operation.type) {
          case CommandType.SendBpOutput:
            this.executeSendBpOutput(operation);
            break;
          case CommandType.PauseVideo:
            this.executePauseVideoCommand();
            break;
          case CommandType.ResumeVideo:
            this.executeResumeVideoCommand();
            break;
          case CommandType.SendZoneMessage:
            dispatch(this.executeSendZoneMessage(operation));
            break;
          default:
            break;
        }
      }
    };
  }

  executeMediaStateCommands(mediaStateId: BsDmId, zoneHSM: MediaZoneHSM, commandSequenceType: CommandSequenceType) {
    return (dispatch: any, getState: any) => {

      const bsdm: DmState = getState().bsdm;
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
            dispatch(this.executeCommand(command, zoneHSM));
          }
        }
      }
    };
  }

  executeTransitionCommands(event: DmcEvent) {
    return (dispatch: any, getState: any) => {
      const bsdm: DmState = getState().bsdm;
      const sequenceId: BsDmId | null =
        dmGetCommandSequenceIdForParentAndType(bsdm, { id: event.id, type: CommandSequenceType.Event });
      if (!isNil(sequenceId)) {
        const sequence: DmCommandSequence | null = dmGetCommandSequenceStateById(bsdm, { id: sequenceId as string });
        if (isNil(sequence)) {
          return;
        }
        const validatedSequence: DmCommandSequence = sequence as DmCommandSequence;
        for (const commandId of validatedSequence.sequence) {
          const command: DmcCommand | null = dmGetCommandById(bsdm, { id: commandId });
          if (!isNil(command)) {
            dispatch(this.executeCommand(command, this.stateMachine as MediaZoneHSM));
          }
        }
      }
    };
  }

}
