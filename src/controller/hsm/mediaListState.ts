import { MediaHState } from './mediaHState';
import { BsBrightSignPlayerState } from '../../type/base';
import { ZoneHSM } from './zoneHSM';
import { DmMediaState, dmGetMediaStateById, DmcMediaListMediaState, DmMediaListContentItem, DmState, DmMediaStateContainer, dmGetMediaStateContainerById, DmMediaStateCollectionState, DmMediaStateSequenceMap, DmcMediaStateContainer, DmcMediaListItem, dmGetMediaListItemById, BsDmId, DmImageContentItem, DmVideoContentItem, DmAudioContentItem, dmGetAssetItemById, DmcEvent } from '@brightsign/bsdatamodel';
import { HState } from './HSM';
import { BsBspDispatch, BsBspStringThunkAction } from '../../type/base';
import { ContentItemType, BsAssetItem, CommandSequenceType, MediaListPlaybackType } from '@brightsign/bscore';
import { ArEventType, HSMStateData } from '../../type/runtime';
import {
  ArAudioItem,
  ArMediaListItemItem,
  ArImagePlaylistItem,
  ArVideoItem,
} from '../../type/arTypes';

import {
  BsAsset,
  BsAssetBase,
  cmGetBsAsset,
  cmBsAssetExists,
  cmGetBsAssetForAssetLocator,
} from '@brightsign/bs-content-manager';
import { isNil } from 'lodash';
import { MediaZoneHSM } from './mediaZoneHSM';

export default class MediaListState extends MediaHState {

  mediaListInactivityTimer: any;
  firstItemDisplayed: boolean;

  playbackActive: boolean;

  startIndex: number;
  specifiedStartIndex: number;
  playbackIndex: number;
  numItems: number;

  transitionToNextEventList: ArEventType[];
  transitionToPreviousEventList: ArEventType[];

  constructor(zoneHSM: ZoneHSM, mediaState: DmMediaState, superState: HState, bsdm: DmState) {

    super(zoneHSM, mediaState.id);

    debugger;

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

    this.transitionToNextEventList = this.getTransitionEventList(bsdm, mediaListState.itemGlobalForwardEventList);
    this.transitionToPreviousEventList = this.getTransitionEventList(bsdm, mediaListState.itemGlobalBackwardEventList);

    // review all of the following - eliminate as much as possible
    // mediaListInactivity


    // const containerObject = mediaListState.containerObject as DmcMediaStateContainer;
    // const mediaStateContainer: DmMediaStateContainer = dmGetMediaStateContainerById(bsdm, { id: containerObject.id }) as DmMediaStateContainer;

    const mediaStates: DmMediaStateCollectionState = bsdm.mediaStates;
    const sequencesByParentId: DmMediaStateSequenceMap = mediaStates.sequencesByParentId;

    const contentItems: ArMediaListItemItem[] = [];

    if (sequencesByParentId.hasOwnProperty(mediaListState.id)) {
      const sequenceByParentId: any = (sequencesByParentId as any)[mediaListState.id];

      sequenceByParentId.sequence.forEach((mediaListItemStateId: BsDmId) => {
        const mediaListItemState: DmcMediaListItem = dmGetMediaListItemById(bsdm, { id: mediaListItemStateId }) as DmcMediaListItem;
        switch (mediaListItemState.contentItem.type) {
          case ContentItemType.Image:
            const imageContentItem: DmImageContentItem = mediaListItemState.contentItem as DmImageContentItem;
            contentItems.push(this.buildImageItem(bsdm, imageContentItem.name, imageContentItem));
            break;
          case ContentItemType.Video:
            const videoContentItem: DmVideoContentItem = mediaListItemState.contentItem as DmVideoContentItem;
            // const videoItem: ArVideoItem = this.buildVideoItem(bsdm, videoContentItem.name, videoContentItem);
            contentItems.push(this.buildVideoItem(bsdm, videoContentItem.name, videoContentItem));
            break;
          case ContentItemType.Audio:
            const audioContentItem: DmAudioContentItem = mediaListItemState.contentItem as DmAudioContentItem;
            contentItems.push(this.buildAudioItem(bsdm, audioContentItem.name, audioContentItem));
            break;
          default:
            break;
        }
      });
    }

    this.numItems = contentItems.length;

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

  buildImageItem(
    bsdm: DmState, stateName: string, imageContentItem: DmImageContentItem): Partial<ArImagePlaylistItem> {

    const assetItem = dmGetAssetItemById(bsdm, { id: imageContentItem.assetId }) as BsAssetItem;

    const arImagePlaylistItem: Partial<ArImagePlaylistItem> = {
      stateName,
      fileName: assetItem.name, // TODO Handle BSN case. TBD based on content manager
      filePath: this.getBsAssetItemPath(assetItem), // TODO Handle BSN case. TBD based on content manager
      transitionEffect: {
        transitionType: imageContentItem.defaultTransition,
        transitionDuration: imageContentItem.transitionDuration * 1000,
      },
    };

    arImagePlaylistItem.type = 'image';
    return arImagePlaylistItem;
  }

  buildVideoItem(
    bsdm: DmState,
    stateName: string,
    videoContentItem: DmVideoContentItem): ArVideoItem {

    const assetItem = dmGetAssetItemById(bsdm, { id: videoContentItem.assetId }) as BsAssetItem;

    return {
      stateName,
      fileName: assetItem.name, // TODO Handle BSN case. TBD based on content manager
      filePath: this.getBsAssetItemPath(assetItem), // TODO Handle BSN case. TBD based on content manager
      videoDisplayMode: videoContentItem.videoDisplayMode,
      automaticallyLoop: videoContentItem.automaticallyLoop,
      type: 'video',
    };
  }

  buildAudioItem(
    bsdm: DmState,
    stateName: string,
    audioContentItem: DmAudioContentItem): ArAudioItem {

    const assetItem = dmGetAssetItemById(bsdm, { id: audioContentItem.assetId }) as BsAssetItem;

    return {
      stateName,
      fileName: assetItem.name, // TODO Handle BSN case. TBD based on content manager
      filePath: this.getBsAssetItemPath(assetItem), // TODO Handle BSN case. TBD based on content manager
      volume: audioContentItem.volume,
      type: 'audio',
    };
  }

  getAutorunUserEventName(event: DmcEvent): string {
    return event.name;
  }

  getArEventDataFromBsdmEventData(bsdm: DmState, event: DmcEvent): any {
    const eventData: any = event.data;
    return eventData;
  }

  getTransitionEventList(bsdm: DmState, eventList: DmcEvent[]): ArEventType[] {
    const transitionEventList: ArEventType[] = [];
    eventList.forEach((event: DmcEvent) => {
      const userEventName = this.getAutorunUserEventName(event);
      const eventData: any = this.getArEventDataFromBsdmEventData(bsdm, event);
      if (!isNil(userEventName)) {
        const autorunUserEvent: ArEventType = {
          EventType: userEventName,
          data: eventData,
        };
        transitionEventList.push(autorunUserEvent);
      }
    });
    return transitionEventList;
  }


  getBsAssetItemPath = (bsAssetItem: BsAssetItem): string => {
    const bsAsset: BsAsset = cmGetBsAsset(bsAssetItem) as BsAsset;
    return bsAsset.fullPath;
  }


  shuffleMediaListContent() {
    console.log('shuffleMediaListContent');
  }

  advanceMediaListPlayback(playImmediate: boolean, executeNextCommands: boolean) {
    console.log('advanceMediaListPlayback');
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

          this.advanceMediaListPlayback(true, false);

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

        // if m.transitionToNextEventList.count() > 0 then
        // if m.transitionToPreviousEventList.count() > 0 then
        return dispatch(this.mediaHStateEventHandler(event, stateData));
      }

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
