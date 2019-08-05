import { HSM, HState, STTopEventHandler } from './HSM';
import { ArEventType, HSMStateData } from '../../type/runtime';
import { Action } from 'redux';
import { DmState, BsDmId, dmGetDataFeedSourceIdsForSign, dmGetDataFeedSourceForFeedSourceId, DmDataFeedSource, DmRemoteDataFeedSource, DmParameterizedString, dmGetSimpleStringFromParameterizedString, dmGetDataFeedIdsForSign, DmcDataFeed, dmGetDataFeedById, dmResetDefaultPropertyValues } from '@brightsign/bsdatamodel';
import { isNil, isString } from 'lodash';

import { downloadMRSSContent, retrieveDataFeed, readDataFeedContentSync } from '../dataFeed';
import { DataFeedUsageType } from '@brightsign/bscore';

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
    }
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
  dataFeedsToDownload: string[] = [];

  constructor(stateMachine: PlayerHSM, id: string, superState: HState) {
    super(stateMachine, id);

    this.HStateEventHandler = this.STPlayingEventHandler;
    this.superState = superState;
  }

  processRetrievedDataFeed(feedAsJson: any, bsdm: DmState, dataFeedSource: DmDataFeedSource) {

    return (dispatch: any, getState: any) => {
      console.log('promise resolved from retrieveLiveDataFeed');
      console.log(feedAsJson);
      // simplified
      // DownloadMRSSContent
      dispatch(downloadMRSSContent(feedAsJson, dataFeedSource));

      // set timer for next feed download
      const updateInterval = dataFeedSource.updateInterval;
      // console.log('updateInterval:');
      // console.log(updateInterval);  // in seconds; setTimeout is in msec.
      dispatch(this.launchRetrieveFeedTimer(updateInterval, dataFeedSource, bsdm).bind(this));
    };
  }

  advanceToNextLiveDataFeedInQueue(bsdm: DmState) {

    return (dispatch: any, getState: any) => {
      this.dataFeedsToDownload.shift();

      if (this.dataFeedsToDownload.length > 0) {
        const dataFeedSourceId = this.dataFeedsToDownload[0];
        const dataFeedSource: DmDataFeedSource | null = dmGetDataFeedSourceForFeedSourceId(bsdm, { id: dataFeedSourceId });
        if (!isNil(dataFeedSource)) {
          retrieveDataFeed(bsdm, dataFeedSource)
            .then((feedAsJson) => {
              this.processRetrievedDataFeed(feedAsJson, bsdm, dataFeedSource);
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
          this.dataFeedsToDownload.push(dataFeedId);
          if (this.dataFeedsToDownload.length === 1) {
            const dataFeedSource: DmDataFeedSource | null = dmGetDataFeedSourceForFeedSourceId(bsdm, { id: dataFeedId });
            if (!isNil(dataFeedSource)) {
              retrieveDataFeed(bsdm, dataFeedSource)
                .then((feedAsJson) => {
                  this.processRetrievedDataFeed(feedAsJson, bsdm, dataFeedSource);
                });
            }
          }
        }
      }
    };
  }

  launchRetrieveFeedTimer(updateInterval: number, dataFeedSource: DmDataFeedSource, bsdm: DmState): any {
    return (dispatch: any, getState: any) => {
      // test
      updateInterval = 60;
      setTimeout(this.retrieveFeedTimeoutHandler.bind(this), updateInterval * 1000, dispatch, this, dataFeedSource, bsdm);
    };
  }

  retrieveFeedTimeoutHandler(dispatch: any, playerHSM: PlayerHSM, dataFeedSource: DmDataFeedSource, bsdm: DmState): any {
    console.log('retrieveFeedTimeoutHandler invoked');
    dispatch(this.queueRetrieveLiveDataFeed(bsdm, dataFeedSource.id));
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

        // if event["EventType"] = "MRSS_DATA_FEED_LOADED" or event["EventType"] = "CONTENT_DATA_FEED_LOADED"     or event["EventType"] = "CONTENT_DATA_FEED_UNCHANGED" then
      } else if (isString(event.EventType) && event.EventType === 'MRSS_DATA_FEED_LOADED') {
        console.log(this.id + ': MRSS_DATA_FEED_LOADED event received');
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



