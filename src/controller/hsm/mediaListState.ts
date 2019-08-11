import { MediaHState } from './mediaHState';
import { ZoneHSM } from './zoneHSM';
import { DmMediaState, dmGetMediaStateById, DmcMediaListMediaState, DmMediaListContentItem, DmState, DmMediaStateContainer, dmGetMediaStateContainerById, DmMediaStateCollectionState, DmMediaStateSequenceMap, DmcMediaStateContainer, DmcMediaListItem, dmGetMediaListItemById, BsDmId, DmImageContentItem, DmVideoContentItem, DmAudioContentItem, dmGetAssetItemById, DmcEvent } from '@brightsign/bsdatamodel';
import { HState } from './HSM';
import { BsBspDispatch, BsBspStringThunkAction } from '../../type/base';
import { ContentItemType, BsAssetItem } from '@brightsign/bscore';
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

export default class MediaListState extends MediaHState {

  constructor(zoneHSM: ZoneHSM, mediaState: DmMediaState, superState: HState, bsdm: DmState) {

    super(zoneHSM, mediaState.id);

    debugger;

    this.mediaState = mediaState;

    this.superState = superState;

    this.HStateEventHandler = this.STDisplayingMediaListItemEventHandler;

    // mediaListInactivity

    const mediaListState = dmGetMediaStateById(bsdm, { id: mediaState.id }) as DmcMediaListMediaState;
    const mediaListContentItem: DmMediaListContentItem = mediaListState.contentItem as DmMediaListContentItem;

    const containerObject = mediaListState.containerObject as DmcMediaStateContainer;
    const mediaStateContainer: DmMediaStateContainer = dmGetMediaStateContainerById(bsdm, { id: containerObject.id }) as DmMediaStateContainer;

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

    const mlDataFeedId: BsDmId = mediaListContentItem.dataFeedId;
    // const dataFeedId = getUniqueDataFeedId(mlDataFeedId);

    const transitionToNextEventList = this.getTransitionEventList(bsdm, mediaListState.itemGlobalForwardEventList);
    const transitionToPreviousEventList = this.getTransitionEventList(bsdm, mediaListState.itemGlobalBackwardEventList);

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

  STDisplayingMediaListItemEventHandler(event: ArEventType, stateData: HSMStateData): BsBspStringThunkAction {
    return (dispatch: BsBspDispatch) => {
      if (event.EventType === 'ENTRY_SIGNAL') {
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
      return 'HANDLED';
    };
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

  
}
