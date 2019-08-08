import { isNil, isNumber } from 'lodash';
import { MediaHState } from './mediaHState';
import { ZoneHSM } from './zoneHSM';
import { DmMediaState, BsDmId } from '@brightsign/bsdatamodel';
import { ArEventType, HSMStateData } from '../../type/runtime';
import { MediaZoneHSM } from './mediaZoneHSM';
import { CommandSequenceType, EventType } from '@brightsign/bscore';
import { HState } from './HSM';
import { BsBrightSignPlayerState, BsBrightSignPlayerModelState } from '../../type/base';
import { DataFeed, DataFeedItem } from '../../type/dataFeed';
import {
  getDataFeedById,
  allDataFeedContentExists,
  dataFeedContentExists,
  getFeedPoolFilePath,
} from '../../selector/dataFeed';

import { postMessage, getReduxStore } from '../runtime';
import { isString } from 'util';
import { setActiveMrssDisplayItem } from '../../model/activeMrssDisplayItem';

export default class MrssState extends MediaHState {

  dataFeedId: BsDmId;

  liveDataFeed: DataFeed;
  currentFeed: DataFeed | null;
  pendingFeed: DataFeed | null;
  displayIndex: number;
  firstItemDisplayed: boolean;

  waitForContentTimer: any;

  constructor(zoneHSM: ZoneHSM, mediaState: DmMediaState, superState: HState, dataFeedId: BsDmId) {

    super(zoneHSM, mediaState.id);
    this.mediaState = mediaState;
    this.superState = superState;
    this.dataFeedId = dataFeedId;

    this.HStateEventHandler = this.STDisplayingMrssStateEventHandler;

    this.currentFeed = null;
    this.pendingFeed = null;
  }

  STDisplayingMrssStateEventHandler(event: ArEventType, stateData: HSMStateData): any {

    return (dispatch: any, getState: any) => {

      if (event.EventType === 'ENTRY_SIGNAL') {

        console.log('mrssState ' + this.id + ': entry signal');
        dispatch(this.executeMediaStateCommands(this.mediaState.id, this.stateMachine as MediaZoneHSM, CommandSequenceType.StateEntry));

        this.waitForContentTimer = null;

        this.firstItemDisplayed = false;

        // TODODF PreDrawImage

        // TODODF set default transition

        this.currentFeed = null;
        this.pendingFeed = null;

        // see if the designated feed has already been downloaded (doesn't imply content exists)
        // TODODF - does the code below properly check to see if the designated feed has been downloaded?
        const dataFeed: DataFeed | null = getDataFeedById(getState(), this.dataFeedId);
        if (!isNil(dataFeed)) {

          // create local versions of key objects
          // m.assetCollection = m.liveDataFeed.assetCollection
          // m.assetPoolFiles = m.liveDataFeed.assetPoolFiles
          this.currentFeed = dataFeed;

          // TODODF - protect the feed that is getting displayed
          // m.ProtectMRSSFeed("display-" + m.liveDataFeed.id$, m.assetCollection)

          this.displayIndex = 0;

          // distinguish between a feed that has no content and a feed in which no content has been downloaded
          if (dataFeed.items.length === 0 || (!allDataFeedContentExists(dataFeed))) {
            // no content in feed - send a message to self to trigger exit from state (like video playback failure)
            const mrssNotFullyLoadedPlaybackEvent: ArEventType = {
              EventType: 'MRSSNotFullyLoadedPlaybackEvent',
              EventData: dataFeed.id,
            };
            dispatch(postMessage(mrssNotFullyLoadedPlaybackEvent));
          }
          else {
            dispatch(this.advanceToNextMRSSItem().bind(this));
          }
        }
        else {
          // this situation will occur when the feed itself has not downloaded yet - send a message to self to trigger exit from state (like video playback failure)
          const mrssNotFullyLoadedPlaybackEvent: ArEventType = {
            EventType: 'MRSSNotFullyLoadedPlaybackEvent',
            EventData: this.dataFeedId,
          };
          dispatch(postMessage(mrssNotFullyLoadedPlaybackEvent));
          return 'HANDLED';
        }
        dispatch(this.launchTimer());
        return 'HANDLED';

      } else if (event.EventType === 'EXIT_SIGNAL') {
        dispatch(this.mediaHStateExitHandler());

        // TODODF
      } else if (event.EventType === 'VideoPlaybackFailureEvent') {

      } else if (event.EventType === 'MRSSNotFullyLoadedPlaybackEvent') {

        console.log('received MRSSNotFullyLoadedPlaybackEvent');

        const dataFeedId: string = event.EventData;
        if (dataFeedId === this.dataFeedId) {
          console.log('launchWaitForContentTimer');
          dispatch(this.launchWaitForContentTimer().bind(this));
        }
        else {
          console.log('do not launchWaitForContentTimer');
          console.log('dataFeedId: ' + dataFeedId);
          console.log('this.dataFeedId: ' + this.dataFeedId);
        }

      // TODODF - in autorun, this message is handled by STPlayingEventHandler
      } else if (isString(event.EventType) && event.EventType === 'MRSS_DATA_FEED_LOADED') {
        console.log(this.id + ': MRSS_DATA_FEED_LOADED event received');
        // dispatch(this.advanceToNextLiveDataFeedInQueue(getState().bsdm).bind(this));
        return 'HANDLED';

      } else if (event.EventType === 'MRSS_SPEC_UPDATED') {
        console.log('***** ***** mrssSpecUpdated');

        const dataFeedId = event.EventData as BsDmId;
        console.log('dataFeedId: ' + dataFeedId);

        if (dataFeedId === this.dataFeedId) {

          const dataFeed: DataFeed | null = getDataFeedById(getState(), dataFeedId) as DataFeed;
          if (isNil(this.currentFeed) || !dataFeedContentExists(this.currentFeed)) {

            // this is the first time that data is available
            this.pendingFeed = null;
            this.currentFeed = dataFeed;

            // protect the feed that is getting displayed
            // TODODF - this.ProtectMRSSFeed("display-" + m.liveDataFeed.id$, m.assetCollection)

            // feed may have been downloaded but it might not have content yet (empty mrss feed)
            // or feed has been downloaded but not all of its content has been downloaded yet - in this case, move on to the next item if possible
            if ((this.currentFeed.items.length === 0) || !allDataFeedContentExists(this.currentFeed)) {
              if (!isNil(this.currentFeed) && (!dataFeedContentExists(this.currentFeed))) {
                this.advanceToNextMRSSItem();
              }
/*
              else if type(m.signChannelEndEvent) = "roAssociativeArray" then
                return m.ExecuteTransition(m.signChannelEndEvent, stateData, "")
*/
              else {
                dispatch(this.launchWaitForContentTimer().bind(this));
                return 'HANDLED';
              }
            }

            // all content exists - display an item
            this.displayIndex = 0;
            this.advanceToNextMRSSItem();
          }
          else {
            // feed was updated. play through existing feed until it reaches the end; then switch to new feed.
            // note - this does not imply that the feed actually changed.
            this.pendingFeed = this.currentFeed;
          }
        }

        return 'HANDLED';

      } else if (event.EventType === EventType.MediaEnd) {
        dispatch(this.advanceToNextMRSSItem().bind(this));
      
      } else {
        return dispatch(this.mediaHStateEventHandler(event, stateData).bind(this));
      }

      stateData.nextState = this.superState;
      return 'SUPER';
    };
  }

  advanceToNextMRSSItem() {

    return (dispatch: any, getState: any) => {

      console.log('************ AdvanceToNextMRSSItem');

      let displayedItem = false;

      while (!displayedItem) {
        if (!isNil(this.currentFeed)) {

          // console.log('this.currentFeed not nil, length = ' + this.currentFeed.items.length);
          // console.log('this.displayIndex: ' + this.displayIndex);

          if (this.displayIndex >= this.currentFeed.items.length) {
            this.displayIndex = 0;
            if (!isNil(this.pendingFeed)) {
              this.currentFeed = this.pendingFeed;
              this.pendingFeed = null;
              // protect the feed that we're switching to (see autorun.brs)
              if (this.currentFeed.items.length === 0 || (!allDataFeedContentExists(this.currentFeed))) {
                if (dataFeedContentExists(this.currentFeed)) {
                  if (isNil(this.displayIndex)) {
                    this.displayIndex = 0;
                  }
                  dispatch(this.advanceToNextMRSSItem());
                }
                else {
                  dispatch(this.launchWaitForContentTimer().bind(this));
                  // this.launchWaitForContentTimer();
                }
              }
            }
          }

          //     if isHtml(displayItem) then
          // else ...

          const displayItem: DataFeedItem = this.currentFeed.items[this.displayIndex];
          const filePath: string = getFeedPoolFilePath(displayItem.guid.toLowerCase());

          console.log('displayItem.guid: ' + displayItem.guid);
          console.log('filePath: ' + filePath);

          if (isString(filePath) && filePath.length > 0) {
            /*
              m.ProtectMRSSItem(displayItem) ' with the current code, this may be unnecessary since the entire feed is protected.
            */
            displayItem.filePath = filePath;
            dispatch(this.displayMRSSSItem(displayItem));
            displayedItem = true;
          }

          this.displayIndex++;
        }
      }
    };
  }

  displayMRSSSItem(displayItem: DataFeedItem) {

    return (dispatch: any, getState: any) => {

      // const filePath: string = getFeedPoolFilePath(displayItem.guid.toLowerCase());

      const mediaZoneHSM: MediaZoneHSM = this.stateMachine as MediaZoneHSM;
      dispatch(setActiveMrssDisplayItem(mediaZoneHSM.zoneId, displayItem));

      if (displayItem.medium === 'image') {
        dispatch(this.launchMrssTimer());
      }
    };
  }

  launchWaitForContentTimer(): any {
    return (dispatch: any, getState: any) => {
      if (isNumber(this.waitForContentTimer)) {
        clearTimeout(this.waitForContentTimer);
      }

      console.log('************ launchWaitForContentTimer');

      const timeoutDuration: number = 1;
      this.waitForContentTimer = setTimeout(this.waitForContentTimeoutHandler, timeoutDuration * 1000, dispatch, this);
    };
  }

  waitForContentTimeoutHandler(dispatch: any, mrssState: MrssState) {
    console.log('************ waitForContentTimeoutHandler');
    if (!isNil(mrssState.currentFeed) && (mrssState.currentFeed.items.length === 0 || (!allDataFeedContentExists(mrssState.currentFeed)))) {
      if (dataFeedContentExists(mrssState.currentFeed)) {
        if (isNil(mrssState.displayIndex)) {
          mrssState.displayIndex = 0;
        }
        dispatch(mrssState.advanceToNextMRSSItem());
      }
      else {
        dispatch(mrssState.launchWaitForContentTimer().bind(mrssState));
      }
    }
    else if (!isNil(mrssState.currentFeed) && !isNil(mrssState.currentFeed.items) && mrssState.currentFeed.items.length === 0) {
      dispatch(mrssState.launchWaitForContentTimer().bind(mrssState));
    }
    else {
      mrssState.displayIndex = 0;
      dispatch(mrssState.advanceToNextMRSSItem());
    }

    // return HANDLED
  }

  launchMrssTimer(): any {

    return (dispatch: any, getState: any) => {

      const interval: number = 4;
      if (interval && interval > 0) {
        this.timeout = setTimeout(this.mrssTimeoutHandler, interval * 1000, this);
      }
    };
  }

  mrssTimeoutHandler(mrssState: MrssState) {
    const reduxStore: any = getReduxStore();
    reduxStore.dispatch(mrssState.advanceToNextMRSSItem().bind(mrssState));
  }

}
