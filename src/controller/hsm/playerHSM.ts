import { HSM, HState, STTopEventHandler } from './HSM';
import { ArEventType, HSMStateData } from '../../type/runtime';
import { Action } from 'redux';
import { DmState, BsDmId, dmGetDataFeedSourceIdsForSign, dmGetDataFeedSourceForFeedSourceId, DmDataFeedSource, DmRemoteDataFeedSource, DmParameterizedString, dmGetSimpleStringFromParameterizedString, dmGetDataFeedIdsForSign, DmcDataFeed, dmGetDataFeedById, dmResetDefaultPropertyValues } from '@brightsign/bsdatamodel';
import { isNil, isString } from 'lodash';

import { readFeedContent, downloadMRSSContent, retrieveLiveDataFeed } from '../dataFeed';

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
      this.restartPlayback('').then(() => {
        const event = {
          EventType: 'TRANSITION_TO_PLAYING'
        };
        dispatch(this.postMessage(event));
      });

      return this.stWaiting;
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

  // needs to be an array, not a map
  dataFeedsToDownload: Map<string, any | null> = new Map();

  constructor(stateMachine: PlayerHSM, id: string, superState: HState) {
    super(stateMachine, id);

    this.HStateEventHandler = this.STPlayingEventHandler;
    this.superState = superState;
  }

  queueRetrieveLiveDataFeed(bsdm: DmState, dataFeedSourceId: BsDmId): Function {

    return (dispatch: any, getState: any) => {
      // TODO - download feeds that are neither MRSS nor content immediately (simple RSS)
      this.dataFeedsToDownload.set(dataFeedSourceId, null);
      if (this.dataFeedsToDownload.size === 1) {
        const dataFeedSource: DmDataFeedSource | null = dmGetDataFeedSourceForFeedSourceId(bsdm, { id: dataFeedSourceId });
        if (!isNil(dataFeedSource)) {
          retrieveLiveDataFeed(bsdm, dataFeedSource)
            .then((feedAsJson) => {
              console.log('promise resolved from retrieveLiveDataFeed');
              console.log(feedAsJson);
              // simplified
              // DownloadMRSSContent
              dispatch(downloadMRSSContent(feedAsJson, dataFeedSource));
            });
        }
      }
    };
  }

  // ONLY SUPPORTS ONE FEED
  readDataFeeds(bsdm: DmState): Function {
    return (dispatch: any, getState: any) => {
      const dataFeedIds: BsDmId[] = dmGetDataFeedIdsForSign(bsdm);
      const dataFeedId = dataFeedIds[0];
      const readFeedContentAction: any = readFeedContent(bsdm, dataFeedId);
      return dispatch(readFeedContentAction);
      // for (const dataFeedId of dataFeedIds) {
      //   const readFeedContentAction: any = this.readFeedContent(bsdm, dataFeedId);
      //   dispatch(this.readFeedContent(bsdm, dataFeedId));
      // }
    };
  }

  fetchDataFeeds(bsdm: DmState): Function {
    return (dispatch: any, getState: any) => {
      const dataFeedSourceIds: BsDmId[] = dmGetDataFeedSourceIdsForSign(bsdm);
      for (const dataFeedSourceId of dataFeedSourceIds) {
        dispatch(this.queueRetrieveLiveDataFeed(bsdm, dataFeedSourceId));
      }
    };
  }

  STPlayingEventHandler(event: ArEventType, stateData: HSMStateData): any {

    return (dispatch: any, getState: any) => {
      stateData.nextState = null;

      if (event.EventType && event.EventType === 'ENTRY_SIGNAL') {

        console.log(this.id + ': entry signal');

        // // initiate data feed downloads
        // dispatch(this.addDataFeeds(getState().bsdm));

        // read existing data feeds
        const readDataFeedsAction: any = this.readDataFeeds(getState().bsdm);
        dispatch(readDataFeedsAction)
          .then(() => {
            // initiate data feed downloads
            dispatch(this.fetchDataFeeds(getState().bsdm));

            // launch playback
            const action: any = (this.stateMachine as PlayerHSM).startPlayback();
            dispatch(action);

            return 'HANDLED';
          });
      // if event["EventType"] = "MRSS_DATA_FEED_LOADED" or event["EventType"] = "CONTENT_DATA_FEED_LOADED"     or event["EventType"] = "CONTENT_DATA_FEED_UNCHANGED" then
      } else if (isString(event.EventType) && event.EventType === 'MRSS_DATA_FEED_LOADED') {
        console.log(this.id + ': MRSS_DATA_FEED_LOADED event received');
        // m.bsp.AdvanceToNextLiveDataFeedInQueue(m.liveDataFeeds)
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



