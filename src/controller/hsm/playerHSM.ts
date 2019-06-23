import axios from 'axios';
import { HSM, HState, STTopEventHandler } from './HSM';
import { ArEventType, HSMStateData } from '../../type/runtime';
import { Action } from 'redux';
import { DmState, BsDmId, dmGetDataFeedSourceIdsForSign, dmGetDataFeedSourceForFeedSourceId, DmDataFeedSource, DmRemoteDataFeedSource, DmParameterizedString, dmGetSimpleStringFromParameterizedString } from '@brightsign/bsdatamodel';
import { isNil } from 'lodash';

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

  dataFeedsToDownload: Map<string, any | null> = new Map();

  constructor(stateMachine: PlayerHSM, id: string, superState: HState) {
    super(stateMachine, id);

    this.HStateEventHandler = this.STPlayingEventHandler;
    this.superState = superState;
  }

  retrieveLiveDataFeed(bsdm: DmState, dataFeedSourceId: BsDmId): Promise<void> {

    // simplified version - URL only; simple string
    const dataFeedSource: DmDataFeedSource | null = dmGetDataFeedSourceForFeedSourceId(bsdm, {id: dataFeedSourceId});
    if (!isNil(dataFeedSource)) {
      const remoteDataFeedSource: DmRemoteDataFeedSource = dataFeedSource as DmRemoteDataFeedSource;
      const urlPS: DmParameterizedString = remoteDataFeedSource.url;
      const url: string | null = dmGetSimpleStringFromParameterizedString(urlPS);
      if (!isNil(url)) {
        return axios({
          method: 'get',
          url,
          responseType: 'text',
        }).then((response: any) => {
          console.log(response);
          return Promise.resolve();
        }).catch( (err) => {
          console.log(err);
          return Promise.reject(err);
        });
      }
    }
    return Promise.reject('dataFeedSource is null');
  }

  queueRetrieveLiveDataFeed(bsdm: DmState, dataFeedSourceId: BsDmId) {

    // TODO - download feeds that are neither MRSS nor content immediately (simple RSS)
    this.dataFeedsToDownload.set(dataFeedSourceId, null);
    if (this.dataFeedsToDownload.size === 1) {
      this.retrieveLiveDataFeed(bsdm, dataFeedSourceId)
        .then( () => {
          console.log('promise resolved from retrieveLiveDataFeed');
        });
    }
  }

  getDataFeeds(bsdm: DmState) {
    const dataFeedSourceIds: BsDmId[] = dmGetDataFeedSourceIdsForSign(bsdm);
    for (const dataFeedSourceId of dataFeedSourceIds) {
      this.queueRetrieveLiveDataFeed(bsdm, dataFeedSourceId)
    }
  }

  STPlayingEventHandler(event: ArEventType, stateData: HSMStateData): any {

    return (dispatch: any, getState: any) => {
      stateData.nextState = null;

      if (event.EventType && event.EventType === 'ENTRY_SIGNAL') {

        console.log(this.id + ': entry signal');

        // initiate data feed downloads
        this.getDataFeeds(getState().bsdm);
        
        // launch playback
        const action: any = (this.stateMachine as PlayerHSM).startPlayback();
        dispatch(action);

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



