import { MediaHState } from './mediaHState';
import { BsBrightSignPlayerState } from '../../type/base';
import { ZoneHSM } from './zoneHSM';
import { DmMediaContentItem } from '@brightsign/bsdatamodel';
import { DmMediaState, dmGetMediaStateById, DmcMediaListMediaState, DmMediaListContentItem, DmState, DmMediaStateContainer, dmGetMediaStateContainerById, DmMediaStateCollectionState, DmMediaStateSequenceMap, DmcMediaStateContainer, DmcMediaListItem, dmGetMediaListItemById, BsDmId, DmImageContentItem, DmVideoContentItem, DmAudioContentItem, dmGetAssetItemById, DmcEvent, DmTimer } from '@brightsign/bsdatamodel';
import { HState } from './HSM';
import { BsBspDispatch, BsBspStringThunkAction, BsBspVoidThunkAction } from '../../type/base';
import { CommandSequenceType, MediaListPlaybackType, EventType } from '@brightsign/bscore';
import { ArEventType, HSMStateData } from '../../type/runtime';

import { isNil, isNumber } from 'lodash';
import { MediaZoneHSM } from './mediaZoneHSM';
import { setActiveMediaListDisplayItem } from '../../model/activeMediaListDisplayItem';

export default class MediaListState extends MediaHState {

  mediaListInactivityTimer: any;
  firstItemDisplayed: boolean;

  playbackActive: boolean;

  startIndex: number;
  specifiedStartIndex: number;
  playbackIndex: number;
  numItems: number;
  playbackIndices: number[] = [];

  transitionToNextEventList: ArEventType[] = [];
  transitionToPreviousEventList: ArEventType[] = [];

  // advanceOnImageTimeout: boolean = false;
  imageAdvanceTimeout: number | null = null;
  imageRetreatTimeout: number | null = null;

  mediaContentItems: DmMediaContentItem[] = [];

  advanceOnTimeoutTimer: any;

  constructor(zoneHSM: ZoneHSM, mediaState: DmMediaState, superState: HState, bsdm: DmState) {

    super(zoneHSM, mediaState.id);

    const mySelf = this;

    this.mediaState = mediaState;

    this.superState = superState;

    this.HStateEventHandler = this.STDisplayingMediaListItemEventHandler;

    const mediaListState = dmGetMediaStateById(bsdm, { id: mediaState.id }) as DmcMediaListMediaState;
    const mediaListContentItem: DmMediaListContentItem = mediaListState.contentItem as DmMediaListContentItem;


    // from SignParams, DmSignPropertyData, DmcSignMetadata
    // inactivityTimeout?: boolean;
    // inactivityTime?: number;
    // TODOML
    const inactivityTimeout = bsdm.sign.properties.inactivityTimeout;
    const inactivityTime = bsdm.sign.properties.inactivityTime;

    if (mediaListContentItem.startIndex > 0) {
      this.specifiedStartIndex = mediaListContentItem.startIndex - 1;
    }
    else {
      this.specifiedStartIndex = 0;
    }
    this.startIndex = this.specifiedStartIndex;

    this.imageAdvanceTimeout = null;
    const advanceOnImageTimeout = this.getTransitionOnImageTimeout(mediaListState.itemGlobalForwardEventList);
    if (advanceOnImageTimeout) {
      this.imageAdvanceTimeout = (advanceOnImageTimeout.data as DmTimer).interval;
    }

    this.imageRetreatTimeout = null;
    const retreatOnImageTimeout = this.getTransitionOnImageTimeout(mediaListState.itemGlobalBackwardEventList);
    if (retreatOnImageTimeout) {
      this.imageRetreatTimeout = (retreatOnImageTimeout.data as DmTimer).interval;
    }

    // this.transitionToNextEventList = this.getTransitionEventList(bsdm, mediaListState.itemGlobalForwardEventList);
    // this.transitionToPreviousEventList = this.getTransitionEventList(bsdm, mediaListState.itemGlobalBackwardEventList);

    // mediaListInactivity

    const mediaStates: DmMediaStateCollectionState = bsdm.mediaStates;
    const sequencesByParentId: DmMediaStateSequenceMap = mediaStates.sequencesByParentId;

    if (sequencesByParentId.hasOwnProperty(mediaListState.id)) {
      const sequenceByParentId: any = (sequencesByParentId as any)[mediaListState.id];

      sequenceByParentId.sequence.forEach((mediaListItemStateId: BsDmId) => {
        const mediaListItemState: DmcMediaListItem = dmGetMediaListItemById(bsdm, { id: mediaListItemStateId }) as DmcMediaListItem;
        mySelf.mediaContentItems.push(mediaListItemState.contentItem);
      });
    }

    this.numItems = mySelf.mediaContentItems.length;

    for (let i = 0; i < this.numItems; i++) {
      this.playbackIndices.push(i);
    }

    // const mlDataFeedId: BsDmId = mediaListContentItem.dataFeedId;

    // const dataFeedId = getUniqueDataFeedId(mlDataFeedId);


    // const arMediaListItem: ArMediaListItem = {
    //   stateName: autorunMediaState.name,
    //   contentItems,
    //   playbackType: mediaListContentItem.playbackType,
    //   startIndex: mediaListContentItem.startIndex,
    //   shuffle: mediaListContentItem.shuffle,
    //   support4KImage: mediaListContentItem.support4KImage,
    //   sendZoneMessage: mediaListContentItem.sendMediaZoneMessage,
    //   useDataFeed: mediaListContentItem.useDataFeed,
    //   dataFeedId,
    //   transitionEffect: {
    //     transitionType: mediaListContentItem.transition,
    //     transitionDuration: mediaListContentItem.transitionDuration * 1000,
    //   },
    //   transitionToNextEventList,
    //   transitionToPreviousEventList,
    //   // BACONTODO - get ordered commands
    //   transitionToNextCommands: getBsCommands(bsdm, mediaListState.itemGlobalPlayNextCommands),
    //   transitionToPreviousCommands: getBsCommands(bsdm, mediaListState.itemGlobalPlayPreviousCommands),
    // };

  }

  getTransitionOnImageTimeout(eventList: DmcEvent[]): DmcEvent | null {
    for (const event of eventList) {
      if (event.type === EventType.Timer) {
        return event;
      }
    }
    return null;
  }
  

  shuffleMediaListContent() {
    console.log('shuffleMediaListContent');
  }


  launchMediaListPlaybackItem(playImmediate: boolean, executeNextCommands: boolean, executePrevCommands: boolean): BsBspVoidThunkAction {

    const mySelf = this;

    return (dispatch: BsBspDispatch, getState: any) => {

      // TODO - not sure of the proper approach to perform this check
      // Make sure we have a valid list
      // itemIndex = m.playbackIndices[m.playbackIndex%]
      const itemIndex = mySelf.playbackIndices[mySelf.playbackIndex];

      // ' get current media item and launch playback
      const mediaZoneHSM: MediaZoneHSM = mySelf.stateMachine as MediaZoneHSM;
      const mediaContentItem = mySelf.mediaContentItems[itemIndex];
      dispatch(setActiveMediaListDisplayItem(mediaZoneHSM.zoneId, mediaContentItem));

      // TODOML
      // if m.sendZoneMessage...
      //   if executeNextCommands then
      //   if executePrevCommands then

      // if timeout event is enabled, 
      if (!isNil(mySelf.imageAdvanceTimeout)) {
        dispatch(mySelf.launchAdvanceOnTimeoutTimer());
      }
    };

  }

  launchAdvanceOnTimeoutTimer(): any {

    const mySelf = this;

    return (dispatch: any, getState: any) => {
      if (isNumber(mySelf.advanceOnTimeoutTimer)) {
        clearTimeout(mySelf.advanceOnTimeoutTimer);
      }

      console.log('************ launchAdvanceOnTimeoutTimer');

      mySelf.advanceOnTimeoutTimer = setTimeout(mySelf.advanceOnTimeoutHandler, (mySelf.imageAdvanceTimeout as number) * 1000, dispatch, mySelf);
    };
  }

  advanceOnTimeoutHandler(dispatch: any, mediaListState: MediaListState) {
    console.log('************ advanceOnTimeoutHandler');
    dispatch(mediaListState.advanceMediaListPlayback(true, true));
  }

  advanceMediaListPlayback(playImmediate: boolean, executeNextCommands: boolean): BsBspVoidThunkAction {

    return (dispatch: BsBspDispatch, getState: any) => {
      dispatch(this.launchMediaListPlaybackItem(playImmediate, executeNextCommands, false));

      this.playbackIndex++;
      if (this.playbackIndex >= this.numItems) {
        this.playbackIndex = 0;
      }
    };
  }

  STDisplayingMediaListItemEventHandler(event: ArEventType, stateData: HSMStateData): BsBspStringThunkAction {
    return (dispatch: BsBspDispatch, getState) => {
      if (event.EventType === 'ENTRY_SIGNAL') {

        console.log('mrssState ' + this.id + ': entry signal');
        dispatch(this.executeMediaStateCommands(this.mediaState.id, this.stateMachine as MediaZoneHSM, CommandSequenceType.StateEntry));

        const bsdm: DmState = getState().bsdm;
        const mediaListState = dmGetMediaStateById(bsdm, { id: this.mediaState.id }) as DmcMediaListMediaState;
        const mediaListContentItem: DmMediaListContentItem = mediaListState.contentItem as DmMediaListContentItem;

        /* 
          ' if using a live data feed, populate items here
          if type(m.liveDataFeed) = "roAssociativeArray" then
          
          ' ensure that data feed content has been loaded
            if type(m.liveDataFeed.assetPoolFiles) = "roAssetPoolFiles" then
              m.PopulateMediaListFromLiveDataFeed()
            end if
          end if
        */

        /*
      if type(m.bsp.mediaListInactivity) = "roAssociativeArray" then
        
        if type(m.bsp.mediaListInactivity.timer) = "roTimer" then
          m.bsp.mediaListInactivity.timer.Stop()
        else
          m.bsp.mediaListInactivity.timer = CreateObject("roTimer")
          m.bsp.mediaListInactivity.timer.SetPort(m.bsp.msgPort)
        end if
        
      end if
        */

        // TODOML
        /*
      m.ConfigureIntraStateEventHandlersButton(m.transitionToNextEventList)
      m.ConfigureIntraStateEventHandlersButton(m.transitionToPreviousEventList)
        */

        this.firstItemDisplayed = false;

        // prevent start index from pointing beyond the number of items in the case where m.playFromBeginning is false
        if (this.numItems > 0 && this.startIndex >= this.numItems) {
          this.startIndex = 0;
        }

        // reset playback index if appropriate
        if (mediaListContentItem.playbackType === MediaListPlaybackType.FromBeginning) {
          this.playbackIndex = this.startIndex;
        }

        if (this.numItems > 0) {

          this.playbackActive = true;

          // prevent start index from pointing beyond the number of items
          if (mediaListContentItem.playbackType === MediaListPlaybackType.FromBeginning) {
            if (this.specifiedStartIndex >= this.numItems) {
              this.startIndex = 0;
            }
            else {
              this.startIndex = this.specifiedStartIndex;
            }
          }

          //  reshuffle media list if appropriate
          if ((this.playbackIndex === this.startIndex) && mediaListContentItem.shuffle) {
            this.shuffleMediaListContent();
          }

          dispatch(this.advanceMediaListPlayback(true, false));

        }
        else {
          this.playbackActive = false;
        }

        return 'HANDLED';

      } else if (event.EventType === 'EXIT_SIGNAL') {
      } else if (event.EventType === 'CONTENT_DATA_FEED_LOADED') {

      } else {
        // else if event['EventType'] = 'AudioPlaybackFailureEvent' then
        // else if m.AtEndOfMediaList(event) and type(m.mediaListEndEvent) = "roAssociativeArray" then
        // else if type(event) = "roVideoEvent" and event.GetSourceIdentity() = m.stateMachine.videoPlayer.GetIdentity() then
        // else if m.stateMachine.type$ = "EnhancedAudio" and type(event) = "roAudioEventMx" then
        // else if m.stateMachine.type$ <> "EnhancedAudio" and IsAudioEvent(m.stateMachine, event) then

        /*
        if m.transitionToNextEventList.count() > 0 then
          advance = m.HandleIntraStateEvent(event, m.transitionToNextEventList)
          if advance then
            m.AdvanceMediaListPlayback(true, true)
            return "HANDLED"
          end if
        end if
        
        if m.transitionToPreviousEventList.count() > 0 then
          retreat = m.HandleIntraStateEvent(event, m.transitionToPreviousEventList)
          if retreat then
            m.RetreatMediaListPlayback(true, true)
            return "HANDLED"
          end if
        end if
        */
        if (this.transitionToNextEventList.length > 0) {

        }

        if (this.transitionToPreviousEventList.length > 0) {

        }

        return dispatch(this.mediaHStateEventHandler(event, stateData));
      }


      return 'HANDLED';
    };
  }

  getMatchingNavigationEvent() {

  }

  handleIntrastateEvent(event: any, navigationEventList: any): boolean {
    return false;
  }
  /*
 Function HandleIntraStateEvent(event as object, navigationEventList as object) as boolean
  
  MEDIA_END = 8
  
  navigationEvent = m.GetMatchingNavigationEvent(navigationEventList, event)
  if navigationEvent = invalid then
    return false
  end if
  
  return true
  
end function

  */


}
