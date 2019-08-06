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
  dataFeedSourceId: BsDmId;

  liveDataFeed: DataFeed;
  currentFeed: DataFeed | null;
  pendingFeed: DataFeed | null;
  displayIndex: number;
  firstItemDisplayed: boolean;

  waitForContentTimer: any;

  constructor(zoneHSM: ZoneHSM, mediaState: DmMediaState, superState: HState, dataFeedId: BsDmId, dataFeedSourceId: BsDmId) {

    super(zoneHSM, mediaState.id);
    this.mediaState = mediaState;
    this.superState = superState;
    this.dataFeedId = dataFeedId;
    this.dataFeedSourceId = dataFeedSourceId;

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
        const bsBrightSignPlayerState: BsBrightSignPlayerState = getState();
        // const dataFeed: DataFeed | null = getDataFeedById(bsBrightSignPlayerState, this.dataFeedId);
        const dataFeed: DataFeed | null = getDataFeedById(getState(), this.dataFeedSourceId);
        if (!isNil(dataFeed)) {

          this.currentFeed = dataFeed;
          // protect the feed that is getting displayed

          this.displayIndex = 0;
          // distinguish between a feed that has no content and a feed in which no content has been downloaded
          if (dataFeed.items.length === 0 || (!allDataFeedContentExists(dataFeed))) {

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
      } else if (event.EventType === 'MRSSNotFullyLoadedPlaybackEvent') {

        console.log('received MRSSNotFullyLoadedPlaybackEvent');

        // temporary while I figure out the confusion between dataFeedId & dataFeedSourceId.
        dispatch(this.launchWaitForContentTimer().bind(this));

        // const dataFeedId: string = event.EventData;
        // // if (dataFeedId === this.dataFeedId) {
        // if (dataFeedId === this.dataFeedSourceId) {
        //   console.log('launchWaitForContentTimer');
        //   dispatch(this.launchWaitForContentTimer().bind(this));
        // }
        // else {
        //   console.log('do not launchWaitForContentTimer');
        //   console.log('dataFeedId: ' + dataFeedId);
        //   console.log('this:');
        //   console.log(this);
        //   console.log('this.dataFeedSourceId: ' + this.dataFeedSourceId);
        // }
      } else if (isString(event.EventType) && event.EventType === 'MRSS_DATA_FEED_LOADED') {
        console.log(this.id + ': MRSS_DATA_FEED_LOADED event received');
        // dispatch(this.advanceToNextLiveDataFeedInQueue(getState().bsdm).bind(this));
        return 'HANDLED';
      } else if (event.EventType === 'MRSS_SPEC_UPDATED') {
        console.log('***** ***** mrssSpecUpdated');

        const dataFeedSourceId = event.EventData as BsDmId;

        console.log('dataFeedSourceId: ' + dataFeedSourceId);

        // const bsBrightSignPlayerState: BsBrightSignPlayerState = getState();
        const dataFeed: DataFeed | null = getDataFeedById(getState(), dataFeedSourceId);

        if (!isNil(dataFeed)) {
          console.log('dataFeed found');
          this.currentFeed = dataFeed;
          this.displayIndex = 0;
        }
        else {
          console.log('dataFeed not found');
        }



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
