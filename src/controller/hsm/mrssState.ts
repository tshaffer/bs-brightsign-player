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
        console.log('mrssState.ts#STDisplayingMrssStateEventHandler, entry signal - invoke getDataFeedById: ' + this.dataFeedId);

        // get the data feed associated with the state
        const dataFeed: DataFeed | null = getDataFeedById(getState(), this.dataFeedId);

        if (!isNil(dataFeed)) {

          console.log('******* - cc');

          // create local versions of key objects
          // m.assetCollection = m.liveDataFeed.assetCollection
          // m.assetPoolFiles = m.liveDataFeed.assetPoolFiles
          this.currentFeed = dataFeed;

          // TODODF - protect the feed that is getting displayed
          // m.ProtectMRSSFeed("display-" + m.liveDataFeed.id$, m.assetCollection)

          this.displayIndex = 0;

          // distinguish between a feed that has no content and a feed in which no content has been downloaded
          if (dataFeed.items.length === 0 || (!allDataFeedContentExists(dataFeed))) {

            console.log('******* - cc1');

            // **** I'm surprised that it exits if it doesn't have all content - that seems contradictory to other spots
            // **** where it plays whatever is available.

            // no content in feed - send a message to self to trigger exit from state (like video playback failure)
            const mrssNotFullyLoadedPlaybackEvent: ArEventType = {
              EventType: 'MRSSNotFullyLoadedPlaybackEvent',
              EventData: dataFeed.id,
            };
            dispatch(postMessage(mrssNotFullyLoadedPlaybackEvent));
          }
          else {
            console.log('******* - cc2');
            dispatch(this.advanceToNextMRSSItem().bind(this));
          }
        }
        else {
          console.log('******* - cc3');
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
        console.log('******* - cc4');
        dispatch(this.mediaHStateExitHandler());

        // TODODF
      } else if (event.EventType === 'VideoPlaybackFailureEvent') {

      } else if (event.EventType === 'MRSSNotFullyLoadedPlaybackEvent') {
        console.log('******* - cc5');

        console.log('received MRSSNotFullyLoadedPlaybackEvent');

        const dataFeedId: string = event.EventData;
        if (dataFeedId === this.dataFeedId) {
          console.log('******* - cc6');
          // if type(m.signChannelEndEvent) = "roAssociativeArray" then
          // return m.ExecuteTransition(m.signChannelEndEvent, stateData, "")
          // else if type(m.currentFeed) = "roAssociativeArray" and m.currentFeed.ContentExists( m.assetPoolFiles ) then
          // 	m.AdvanceToNextMRSSItem()

          console.log('launchWaitForContentTimer');
          dispatch(this.launchWaitForContentTimer().bind(this));
        }
        else {
          console.log('******* - cc7');
          console.log('do not launchWaitForContentTimer');
          console.log('dataFeedId: ' + dataFeedId);
          console.log('this.dataFeedId: ' + this.dataFeedId);
        }

        // TODODF - in autorun, this message is handled by STPlayingEventHandler
      } else if (event.EventType === 'MRSS_DATA_FEED_LOADED') {
        console.log('******* - cc8');
        console.log(this.id + ': MRSS_DATA_FEED_LOADED event received in mrssState event handler');
        // dispatch(this.advanceToNextLiveDataFeedInQueue(getState().bsdm).bind(this));
        return 'HANDLED';

      } else if (event.EventType === 'MRSS_SPEC_UPDATED') {
        console.log('******* - cc9');
        console.log('***** ***** mrssSpecUpdated');

        const dataFeedId = event.EventData as BsDmId;
        console.log('dataFeedId: ' + dataFeedId);

        if (dataFeedId === this.dataFeedId) {
          console.log('******* - cc10');

          console.log('mrssState.ts#STDisplayingMrssStateEventHandler, MRSS_SPEC_UPDATED signal - invoke getDataFeedById: ' + this.dataFeedId);
          const dataFeed: DataFeed | null = getDataFeedById(getState(), dataFeedId) as DataFeed;
          // **** dataFeed is the updated data feed
          // **** currentFeed is the feed that the state is currently displaying
          // ******** are these really two separate objects? or do they point to the same thing?

          if (isNil(this.currentFeed) || !dataFeedContentExists(this.currentFeed)) {
            console.log('******* - cc11');

            // this is the first time that data is available
            this.pendingFeed = null;
            this.currentFeed = dataFeed;

            // protect the feed that is getting displayed
            // TODODF - this.ProtectMRSSFeed("display-" + m.liveDataFeed.id$, m.assetCollection)

            // feed may have been downloaded but it might not have content yet (empty mrss feed)
            // or feed has been downloaded but not all of its content has been downloaded yet - in this case, move on to the next item if possible
            if ((this.currentFeed.items.length === 0) || !allDataFeedContentExists(this.currentFeed)) {
              if (!isNil(this.currentFeed) && (!dataFeedContentExists(this.currentFeed))) {
                console.log('******* - cc12');
                this.advanceToNextMRSSItem();
              }
              /*
                else if type(m.signChannelEndEvent) = "roAssociativeArray" then
                  return m.ExecuteTransition(m.signChannelEndEvent, stateData, "")
              */
              // ASSERTION
              // there is a feed associated with this state.
              // the feed has items specified
              // not all the specified feed items have been downloaded
              // some of the specified feed items have been downloaded
              // REPRODUCE THIS SITUATION - WHY WOULDN'T IT PLAY THE CONTENT IT HAS?
              else {
                console.log('******* - cc13');
                dispatch(this.launchWaitForContentTimer().bind(this));
                return 'HANDLED';
              }
            }

            // all content exists - display an item
            this.displayIndex = 0;
            this.advanceToNextMRSSItem();
          }
          else {
            console.log('******* - cc14');

            console.log('***** - STDisplayingMrssStateEventHandler, feed was updated. play through existing feed until it reaches the end; then switch to new feed.');

            // feed was updated. play through existing feed until it reaches the end; then switch to new feed.
            // note - this does not imply that the feed actually changed.
            // this.pendingFeed = this.currentFeed;
            this.pendingFeed = dataFeed;
          }
        }
        return 'HANDLED';
      } else if (event.EventType === 'EndOfFeed') {
        console.log('******* - cc15');
        const newEvent: ArEventType = {
          EventType: EventType.MediaEnd,
        };
        return dispatch(this.mediaHStateEventHandler(newEvent, stateData).bind(this));
      } else if (event.EventType === EventType.MediaEnd) {
        console.log('******* - cc16');
        return dispatch(this.advanceToNextMRSSItem().bind(this));
      } else {
        console.log('******* - cc17');
        return dispatch(this.mediaHStateEventHandler(event, stateData).bind(this));
      }

      stateData.nextState = this.superState;
      return 'SUPER';
    };
  }

  // bases operations on currentFeed
  // simple case, plays the item pointed to by displayIndex - increments displayIndex
  // if displayIndex >= numItems in feed, reset index to 0. checks for existence of pendingFeed
  // if pending feed is not nil, it sets current feed to pending feed, and sets pending feed to null

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
              console.log('******* - cc18');

              console.log('***** - AdvanceToNextMRSSItem switch to pending feed');

              console.log('***** - before switch, number of items is: ' + this.currentFeed.items.length.toString());

              this.currentFeed = this.pendingFeed;
              this.pendingFeed = null;

              console.log('***** - after switch, number of items is: ' + this.currentFeed.items.length.toString());

              // protect the feed that we're switching to (see autorun.brs)

              // check to see if the feed it switched to is empty OR doesn't have all its content
              if (this.currentFeed.items.length === 0 || (!allDataFeedContentExists(this.currentFeed))) {
                // if true, if it has some content, play it.
                if (dataFeedContentExists(this.currentFeed)) {
                  console.log('******* - cc19');
                  if (isNil(this.displayIndex)) {
                    this.displayIndex = 0;
                  }
                  dispatch(this.advanceToNextMRSSItem());
                }
                // otherwise, wait for content
                else {
                  console.log('******* - cc20');

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
            console.log('******* - cc21');

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
        console.log('******* - cc22');
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
      console.log('******* - cc23');
      if (dataFeedContentExists(mrssState.currentFeed)) {
        if (isNil(mrssState.displayIndex)) {
          console.log('******* - cc24');

          mrssState.displayIndex = 0;
        }
        dispatch(mrssState.advanceToNextMRSSItem());
      }
      else {
        console.log('******* - cc25');
        dispatch(mrssState.launchWaitForContentTimer().bind(mrssState));
      }
    }
    else if (!isNil(mrssState.currentFeed) && !isNil(mrssState.currentFeed.items) && mrssState.currentFeed.items.length === 0) {
      console.log('******* - cc26');
      dispatch(mrssState.launchWaitForContentTimer().bind(mrssState));
    }
    else {
      console.log('******* - cc27');
      mrssState.displayIndex = 0;
      dispatch(mrssState.advanceToNextMRSSItem());
    }

    // return HANDLED
  }

  launchMrssTimer(): any {

    return (dispatch: any, getState: any) => {

      const interval: number = 3;
      if (interval && interval > 0) {
        this.timeout = setTimeout(this.mrssTimeoutHandler, interval * 1000, this);
      }
    };
  }

  // equivalent to   'else if type(event) = "roTimerEvent" then' in autorun
  mrssTimeoutHandler(mrssState: MrssState) {

    const reduxStore: any = getReduxStore();

    // if (mrssState.atEndOfFeed().bind(mrssState)) { ?proper way to do this?
    const atEndOfFeed = mrssState.atEndOfFeed.bind(mrssState);
    const endOfFeed = atEndOfFeed();
    if (endOfFeed) {
      console.log('******* - cc28');

      const event: ArEventType = {
        EventType: 'EndOfFeed',
      };
      reduxStore.dispatch(mrssState.stateMachine.dispatchEvent(event));
      // return dispatch(this.mediaHStateEventHandler(event, stateData));

    }
    else {
      console.log('******* - cc29');

      reduxStore.dispatch(mrssState.advanceToNextMRSSItem().bind(mrssState));
    }
  }

  //  need to also consider the case where it's not at the end but there's no more content.
  atEndOfFeed(): boolean {
    return this.displayIndex >= (this.currentFeed as DataFeed).items.length;
  }
}
