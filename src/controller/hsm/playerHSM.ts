import { HSM, HState, STTopEventHandler } from './HSM';
import { ArEventType, HSMStateData } from '../../type/runtime';
import { Action } from 'redux';
import { DmState, BsDmId, dmGetDataFeedSourceForFeedSourceId, DmDataFeedSource, dmGetDataFeedIdsForSign, DmcDataFeed, dmGetDataFeedById, dmGetDataFeedSourceForFeedId } from '@brightsign/bsdatamodel';
import { isNil, isString } from 'lodash';

import { downloadMRSSContent, retrieveDataFeed, readDataFeedContentSync, feedIsMrss, downloadFeedContent } from '../dataFeed';
import { DataFeedUsageType, DataFeedType } from '@brightsign/bscore';

export class PlayerHSM extends HSM {

  type: string;
  stTop: HState;
  stPlayer: HState;
  stPlaying: HState;
  stWaiting: HState;

  startPlayback: () => any;
  restartPlayback: (presentationName: string) => Promise<void>;
  postMessage: (event: any) => Action;

  constructor(
    hsmId: string,
    startPlayback: () => any,
    restartPlayback: (presentationName: string) => Promise<void>,
    postMessage: (event: ArEventType) => any, // TODO
    dispatchEvent: any) {

    super(hsmId, dispatchEvent);

    this.type = 'player';

    this.stTop = new HState(this, 'Top');
    this.stTop.HStateEventHandler = STTopEventHandler;

    this.initialPseudoStateHandler = this.initializePlayerStateMachine;

    this.stPlayer = new STPlayer(this, 'Player', this.stTop);
    this.stPlaying = new STPlaying(this, 'Playing', this.stPlayer);
    this.stWaiting = new STWaiting(this, 'Waiting', this.stPlayer);

    this.topState = this.stTop;

    this.startPlayback = startPlayback;
    this.restartPlayback = restartPlayback;
    this.postMessage = postMessage;
  }

  initializePlayerStateMachine(): any {
    return (dispatch: any) => {
      return this.restartPlayback('')
        .then(() => {
          return Promise.resolve(this.stPlaying);
        });
    };
  }
}

class STPlayer extends HState {

  constructor(stateMachine: PlayerHSM, id: string, superState: HState) {

    super(stateMachine, id);

    this.HStateEventHandler = this.STPlayerEventHandler;
    this.superState = superState;
  }

  STPlayerEventHandler(event: ArEventType, stateData: HSMStateData): any {

    return (dispatch: any) => {
      stateData.nextState = null;

      stateData.nextState = this.superState;
      return 'SUPER';
    };
  }
}

class STPlaying extends HState {

  // ids of dataFeeds to download
  dataFeedIdsToDownload: string[] = [];

  constructor(stateMachine: PlayerHSM, id: string, superState: HState) {
    super(stateMachine, id);

    this.HStateEventHandler = this.STPlayingEventHandler;
    this.superState = superState;
  }

  // see PlayingEventUrlHandler in autorun for reference
  processRetrievedDataFeed(feedAsJson: any, bsdm: DmState, dataFeed: DmcDataFeed) {

    // TODODF - headRequest

    return (dispatch: any, getState: any) => {
      console.log('promise resolved from retrieveLiveDataFeed');
      console.log(feedAsJson);

      if (dataFeed.usage !== DataFeedUsageType.Mrss) {

        if (dataFeed.usage === DataFeedUsageType.Content) {
          if (dataFeed.type === DataFeedType.BSNDynamicPlaylist || dataFeed.type === DataFeedType.BSNMediaFeed) {
            /*
              liveDataFeed.ParseMRSSFeed(liveDataFeed.rssFileName$)
              liveDataFeed.ConvertMRSSFormatToContent()
            */
          }
          else {
            /*
              liveDataFeed.ParseCustomContentFormat(liveDataFeed.rssFileName$)
            */
          }
        }
        else
        {
          /*
            liveDataFeed.ParseSimpleRSSFeed(liveDataFeed.rssFileName$)
          */
        }

        // TODODF autoGenerateUserVariables
      }
      else {
        /*
          ' These must be valid objects even for MRSS feeds (at least for now)
          liveDataFeed.articles = CreateObject("roArray", 1, true)
          liveDataFeed.articleTitles = CreateObject("roArray", 1, true)
          liveDataFeed.articlesByTitle = { }
        */
      }

      const isMRSSFeed = feedIsMrss(feedAsJson);

      if (dataFeed.usage === DataFeedUsageType.Content) {
        dispatch(downloadFeedContent());
      }
      else if (dataFeed.usage === DataFeedUsageType.Mrss && (dataFeed.parserPlugin !== '' || isMRSSFeed)) {
        dispatch(downloadMRSSContent(bsdm, feedAsJson, dataFeed.id));
      }

      // TODODF autoGenerateUserVariables

      // TODODF update user variables

      // send internal message indicating that the data feed has been updated
      const event: ArEventType = {
        EventType: 'LIVE_DATA_FEED_UPDATE',
        EventData: dataFeed.id,
      };
      const action: any = (this.stateMachine as PlayerHSM).postMessage(event);
      dispatch(action);
      
      // TODODF - headRequest

      // set timer to check for feed update
      dispatch(this.launchRetrieveFeedTimer(dataFeed.id, bsdm).bind(this));
    };
  }

  advanceToNextLiveDataFeedInQueue(bsdm: DmState) {

    return (dispatch: any, getState: any) => {
      this.dataFeedIdsToDownload.shift();

      if (this.dataFeedIdsToDownload.length > 0) {
        const dataFeedId = this.dataFeedIdsToDownload[0];
        const dataFeed: DmcDataFeed | null = dmGetDataFeedById(bsdm, { id: dataFeedId }) as DmcDataFeed;
        const dataFeedSource: DmDataFeedSource | null = dmGetDataFeedSourceForFeedSourceId(bsdm, { id: dataFeed.feedSourceId });
        if (!isNil(dataFeedSource)) {
          retrieveDataFeed(bsdm, dataFeed)
            .then((feedAsJson) => {
              dispatch(this.processRetrievedDataFeed(feedAsJson, bsdm, dataFeed));
            });
        }
      }
    };
  }

  queueRetrieveLiveDataFeed(bsdm: DmState, dataFeedId: BsDmId) {

    return (dispatch: any, getState: any) => {

      const dataFeed: DmcDataFeed | null = dmGetDataFeedById(bsdm, { id: dataFeedId });

      if (!isNil(dataFeed)) {
        if (dataFeed.usage === DataFeedUsageType.Text) {
          // download feeds that are neither MRSS nor content immediately (simple RSS)
          // TODODF - m.RetrieveLiveDataFeed(liveDataFeeds, liveDataFeed)
        }
        else {
          this.dataFeedIdsToDownload.push(dataFeedId);
          if (this.dataFeedIdsToDownload.length === 1) {
            const dataFeedSource: DmDataFeedSource | null = dmGetDataFeedSourceForFeedSourceId(bsdm, { id: dataFeed.feedSourceId });
            if (!isNil(dataFeedSource)) {
              retrieveDataFeed(bsdm, dataFeed)
                .then((feedAsJson) => {
                  dispatch(this.processRetrievedDataFeed(feedAsJson, bsdm, dataFeed));
                });
            }
          }
        }
      }
    };
  }

  launchRetrieveFeedTimer(dataFeedId: BsDmId, bsdm: DmState): any {
    return (dispatch: any, getState: any) => {

      const dataFeedSource = dmGetDataFeedSourceForFeedId(bsdm, { id: dataFeedId }) as DmDataFeedSource;
      let updateInterval = dataFeedSource.updateInterval;

      // test
      updateInterval = 60;

      setTimeout(this.retrieveFeedTimeoutHandler.bind(this), updateInterval * 1000, dispatch, this, dataFeedId, bsdm);
    };
  }

  retrieveFeedTimeoutHandler(dispatch: any, playerHSM: PlayerHSM, dataFeedId: BsDmId, bsdm: DmState): any {
    console.log('retrieveFeedTimeoutHandler invoked');
    dispatch(this.queueRetrieveLiveDataFeed(bsdm, dataFeedId));
  }

  readDataFeeds(bsdm: DmState) {

    return (dispatch: any) => {

      const dataFeedIds: BsDmId[] = dmGetDataFeedIdsForSign(bsdm);

      const readNextFile = (index: number): Promise<void> => {

        if (index >= dataFeedIds.length) {
          return Promise.resolve();
        }

        const dataFeedId = dataFeedIds[index];
        const maybeDataFeed: DmcDataFeed | null = dmGetDataFeedById(bsdm, { id: dataFeedId });
        // TODODF
        const dataFeed: DmcDataFeed = maybeDataFeed as DmcDataFeed;
        return dispatch(readDataFeedContentSync(dataFeed))
          .then(() => {
            return readNextFile(index + 1);
          }).catch((error: Error) => {
            console.log(error);
            debugger;
          });
      };

      return readNextFile(0);
    };
  }

  fetchDataFeeds(bsdm: DmState) {
    return (dispatch: any, getState: any) => {
      const dataFeedIds: BsDmId[] = dmGetDataFeedIdsForSign(bsdm);
      for (const dataFeedId of dataFeedIds) {
        dispatch(this.queueRetrieveLiveDataFeed(bsdm, dataFeedId));
      }
    };
  }

  STPlayingEventHandler(event: ArEventType, stateData: HSMStateData): any {

    return (dispatch: any, getState: any) => {
      stateData.nextState = null;

      console.log('***** - STPlayingEventHandler, event type ' + event.EventType)

      if (event.EventType && event.EventType === 'ENTRY_SIGNAL') {

        console.log(this.id + ': entry signal');

        // read existing data feeds
        const readDataFeedsAction: any = this.readDataFeeds(getState().bsdm);
        dispatch(readDataFeedsAction)
          .then(() => {

            // initiate data feed downloads (performed asynchronously)
            dispatch(this.fetchDataFeeds(getState().bsdm));

            // launch playback
            const action: any = (this.stateMachine as PlayerHSM).startPlayback();
            dispatch(action);

            return 'HANDLED';
          });

      } else if (isString(event.EventType) && (event.EventType === 'MRSS_DATA_FEED_LOADED') || (event.EventType === 'CONTENT_DATA_FEED_LOADED') || (event.EventType === 'CONTENT_DATA_FEED_UNCHANGED')) {
        console.log('******* - cc30');
        console.log(this.id + ': MRSS_DATA_FEED_LOADED event received in playerHSM');
        dispatch(this.advanceToNextLiveDataFeedInQueue(getState().bsdm).bind(this));
        return 'HANDLED';
      }

      stateData.nextState = this.superState;
      return 'SUPER';
    };
  }
}

class STWaiting extends HState {

  constructor(stateMachine: PlayerHSM, id: string, superState: HState) {
    super(stateMachine, id);

    this.HStateEventHandler = this.STWaitingEventHandler;
    this.superState = superState;
  }

  STWaitingEventHandler(event: ArEventType, stateData: HSMStateData): any {

    return (dispatch: any) => {
      stateData.nextState = null;

      if (event.EventType && event.EventType === 'ENTRY_SIGNAL') {
        console.log(this.id + ': entry signal');
        return 'HANDLED';
      } else if (event.EventType && event.EventType === 'TRANSITION_TO_PLAYING') {
        console.log(this.id + ': TRANSITION_TO_PLAYING event received');
        stateData.nextState = (this.stateMachine as PlayerHSM).stPlaying;
        return 'TRANSITION';
      }

      stateData.nextState = this.superState;
      return 'SUPER';
    };
  }
}



