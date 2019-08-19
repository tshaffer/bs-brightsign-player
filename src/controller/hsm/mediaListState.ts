import { Asset } from '@brightsign/assetpool';
import { MediaHState } from './mediaHState';
import { BsBrightSignPlayerState } from '../../type/base';
import { ZoneHSM } from './zoneHSM';
import { DmMediaContentItem } from '@brightsign/bsdatamodel';
import { DmMediaState, dmGetMediaStateById, DmcMediaListMediaState, DmMediaListContentItem, DmState, DmMediaStateContainer, dmGetMediaStateContainerById, DmMediaStateCollectionState, DmMediaStateSequenceMap, DmcMediaStateContainer, DmcMediaListItem, dmGetMediaListItemById, BsDmId, DmImageContentItem, DmVideoContentItem, DmAudioContentItem, dmGetAssetItemById, DmcEvent, DmTimer, BsDmIdNone } from '@brightsign/bsdatamodel';
import { HState } from './HSM';
import { BsBspDispatch, BsBspStringThunkAction, BsBspVoidThunkAction } from '../../type/base';
import { CommandSequenceType, MediaListPlaybackType, EventType, ContentItemType } from '@brightsign/bscore';
import { ArEventType, HSMStateData } from '../../type/runtime';

import { isNil, isNumber } from 'lodash';
import { MediaZoneHSM } from './mediaZoneHSM';
import { setActiveMediaListDisplayItem } from '../../model/activeMediaListDisplayItem';

import { ArContentFeed, ArContentItem } from '../../type/dataFeed';
import {
  getDataFeedById,
  allDataFeedContentExists,
  dataFeedContentExists,
  getFeedPoolFilePath,
} from '../../selector/dataFeed';
import { MediaListItem } from '../../type/mediaListItem';

export default class MediaListState extends MediaHState {

  mediaListState: DmcMediaListMediaState; 
  mediaListContentItem: DmMediaListContentItem;
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

  imageAdvanceTimeout: number | null = null;
  imageRetreatTimeout: number | null = null;

  // mediaContentItems: DmMediaContentItem[] = [];
  mediaListItems: MediaListItem[] = [];
  advanceOnTimeoutTimer: any;

  dataFeedId: BsDmId;
  dataFeed: ArContentFeed;

  constructor(zoneHSM: ZoneHSM, mediaState: DmMediaState, superState: HState, bsdm: DmState) {

    super(zoneHSM, mediaState.id);

    const mySelf = this;

    this.mediaState = mediaState;

    this.superState = superState;

    this.HStateEventHandler = this.STDisplayingMediaListItemEventHandler;

    this.mediaListState = dmGetMediaStateById(bsdm, { id: mediaState.id }) as DmcMediaListMediaState;
    this.mediaListContentItem = this.mediaListState.contentItem as DmMediaListContentItem;

    const inactivityTimeout = bsdm.sign.properties.inactivityTimeout;
    const inactivityTime = bsdm.sign.properties.inactivityTime;

    if (this.mediaListContentItem.startIndex > 0) {
      this.specifiedStartIndex = this.mediaListContentItem.startIndex - 1;
    }
    else {
      this.specifiedStartIndex = 0;
    }
    this.startIndex = this.specifiedStartIndex;

    this.imageAdvanceTimeout = null;
    const advanceOnImageTimeout = this.getTransitionOnImageTimeout(this.mediaListState.itemGlobalForwardEventList);
    if (advanceOnImageTimeout) {
      this.imageAdvanceTimeout = (advanceOnImageTimeout.data as DmTimer).interval;
    }

    this.imageRetreatTimeout = null;
    const retreatOnImageTimeout = this.getTransitionOnImageTimeout(this.mediaListState.itemGlobalBackwardEventList);
    if (retreatOnImageTimeout) {
      this.imageRetreatTimeout = (retreatOnImageTimeout.data as DmTimer).interval;
    }

    const mediaStates: DmMediaStateCollectionState = bsdm.mediaStates;
    const sequencesByParentId: DmMediaStateSequenceMap = mediaStates.sequencesByParentId;

    if (sequencesByParentId.hasOwnProperty(this.mediaListState.id)) {
      const sequenceByParentId: any = (sequencesByParentId as any)[this.mediaListState.id];

      sequenceByParentId.sequence.forEach((mediaListItemStateId: BsDmId) => {
        const mediaListItemState: DmcMediaListItem = dmGetMediaListItemById(bsdm, { id: mediaListItemStateId }) as DmcMediaListItem;
        const mediaListItem: MediaListItem = {
          filePath: mediaListItemState.contentItem.name,
          contentItemType: mediaListItemState.contentItem.type,
        };
        mySelf.mediaListItems.push(mediaListItem);
      });
    }

    this.numItems = mySelf.mediaListItems.length;

    for (let i = 0; i < this.numItems; i++) {
      this.playbackIndices.push(i);
    }

    this.dataFeedId = BsDmIdNone;
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

      const itemIndex = mySelf.playbackIndices[mySelf.playbackIndex];

      // get current media item and launch playback
      const mediaZoneHSM: MediaZoneHSM = mySelf.stateMachine as MediaZoneHSM;
      const mediaListItem = mySelf.mediaListItems[itemIndex];
      dispatch(setActiveMediaListDisplayItem(mediaZoneHSM.zoneId, mediaListItem));

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

      mySelf.advanceOnTimeoutTimer = setTimeout(mySelf.advanceOnTimeoutHandler, (mySelf.imageAdvanceTimeout as number) * 1000, dispatch, mySelf);
    };
  }

  advanceOnTimeoutHandler(dispatch: any, mediaListState: MediaListState) {
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

        this.firstItemDisplayed = false;

        // prevent start index from pointing beyond the number of items in the case where m.playFromBeginning is false
        if (this.numItems > 0 && this.startIndex >= this.numItems) {
          this.startIndex = 0;
        }

        // reset playback index if appropriate
        if (this.mediaListContentItem.playbackType === MediaListPlaybackType.FromBeginning) {
          this.playbackIndex = this.startIndex;
        }

        if (this.numItems > 0) {

          this.playbackActive = true;

          // prevent start index from pointing beyond the number of items
          if (this.mediaListContentItem.playbackType === MediaListPlaybackType.FromBeginning) {
            if (this.specifiedStartIndex >= this.numItems) {
              this.startIndex = 0;
            }
            else {
              this.startIndex = this.specifiedStartIndex;
            }
          }

          //  reshuffle media list if appropriate
          if ((this.playbackIndex === this.startIndex) && this.mediaListContentItem.shuffle) {
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
        // not right - see below
        this.dataFeedId = event.EventData;
        // this compares a dataFeedId to a sourceDataFeed.id - need to figure this out!!
        // if (dataFeedId === this.mediaListState.sourceDataFeed.id) {
        this.dataFeed = getDataFeedById(getState(), this.dataFeedId) as ArContentFeed;
        this.PopulateMediaListFromLiveDataFeed();

        // reset the playback index to the start point
        if (this.specifiedStartIndex >= this.numItems) {
          this.startIndex = 0;
        }
        else {
          this.startIndex = this.specifiedStartIndex;
        }

        this.playbackIndex = this.startIndex;
        
        if (this.numItems > 0) {
          //  reshuffle media list if appropriate
          if ((this.playbackIndex === this.startIndex) && this.mediaListContentItem.shuffle) {
            this.shuffleMediaListContent();
          }
        }
        
        if (!this.playbackActive) {
          this.playbackActive = true;
          dispatch(this.advanceMediaListPlayback(true, false));
        }
        
        return 'HANDLED';

      } else {
        // else if event['EventType'] = 'AudioPlaybackFailureEvent' then
        // else if m.AtEndOfMediaList(event) and type(m.mediaListEndEvent) = "roAssociativeArray" then
        // else if type(event) = "roVideoEvent" and event.GetSourceIdentity() = m.stateMachine.videoPlayer.GetIdentity() then
        // else if m.stateMachine.type$ = "EnhancedAudio" and type(event) = "roAudioEventMx" then
        // else if m.stateMachine.type$ <> "EnhancedAudio" and IsAudioEvent(m.stateMachine, event) then

        if (this.transitionToNextEventList.length > 0) {

        }

        if (this.transitionToPreviousEventList.length > 0) {

        }

        return dispatch(this.mediaHStateEventHandler(event, stateData));
      }


      return 'HANDLED';
    };
  }

  PopulateMediaListFromLiveDataFeed()
  {
    const dataFeed: ArContentFeed = this.dataFeed as ArContentFeed;
    const contentItems: ArContentItem[] = dataFeed.contentItems;
    // const itemUrls: string[] = dataFeed.itemUrls as string[];

    this.numItems = contentItems.length;

    for (let i = 0; i < this.numItems; i++) {
      this.playbackIndices.push(i);

      const filePath: string = getFeedPoolFilePath(contentItems[i].guid.toLowerCase());

      const mediaListItem: MediaListItem = {
        filePath,
        contentItemType: contentItems[i].medium,
      };
      this.mediaListItems.push(mediaListItem);
    }
  }

  getMatchingNavigationEvent() {

  }

  handleIntrastateEvent(event: any, navigationEventList: any): boolean {
    return false;
  }
}
