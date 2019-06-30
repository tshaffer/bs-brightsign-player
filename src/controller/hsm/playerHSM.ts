import axios from 'axios';
import { HSM, HState, STTopEventHandler } from './HSM';
import { ArEventType, HSMStateData, ArDataFeed, ArDataFeedItem } from '../../type/runtime';
import { Action } from 'redux';
import { DmState, BsDmId, dmGetDataFeedSourceIdsForSign, dmGetDataFeedSourceForFeedSourceId, DmDataFeedSource, DmRemoteDataFeedSource, DmParameterizedString, dmGetSimpleStringFromParameterizedString } from '@brightsign/bsdatamodel';
import { isNil } from 'lodash';
import { xmlStringToJson } from '../../utility/helpers';

import AssetPool from '@brightsign/assetpool';
import AssetPoolFetcher from '@brightsign/assetpoolfetcher';
import AssetRealizer from '@brightsign/assetrealizer';
const assetPool: AssetPool = new AssetPool('/Users/tedshaffer/Desktop/autotron/feedPool');
const assetPoolFetcher = new AssetPoolFetcher(assetPool);

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

  retrieveLiveDataFeed(bsdm: DmState, dataFeedSource: DmDataFeedSource): Promise<any> {

    // simplified version - URL only; simple string
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
          return xmlStringToJson(response.data);
        }).then((feedAsJson) => {
          console.log(feedAsJson);
          return Promise.resolve(feedAsJson);
        }).catch((err) => {
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
      const dataFeedSource: DmDataFeedSource | null = dmGetDataFeedSourceForFeedSourceId(bsdm, { id: dataFeedSourceId });
      if (!isNil(dataFeedSource)) {
        this.retrieveLiveDataFeed(bsdm, dataFeedSource)
          .then((feedAsJson) => {
            console.log('promise resolved from retrieveLiveDataFeed');
            // simplified
            // DownloadMRSSContent
            this.downloadMRSSContent(feedAsJson, dataFeedSource);
          });
      }
    }
  }

  getFeedItems(feed: any): ArDataFeedItem[] {

    const feedItems: ArDataFeedItem[] = [];

    const items: any = feed.rss.channel.item;
    for (const item of items) {
      const mediaContent: any = item['media:content'].$;
      const feedItem: ArDataFeedItem = {
        description: item.description,
        guid: item.guid,
        link: item.link,
        title: item.title,
        pubDate: item.pubDate,

        duration: mediaContent.duration,
        fileSize: mediaContent.fileSize,
        medium: mediaContent.medium,
        type: mediaContent.type,
        url: mediaContent.url,
      };

      feedItems.push(feedItem);
    }
    return feedItems;
  }

  downloadMRSSContent(rawFeed: any, dataFeedSource: DmDataFeedSource) {

    /* feed level properties
    if name = "ttl" then
      m.SetTTLMinutes(elt.GetBody())
    else if name = "frameuserinfo:playtime" then
      m.playtime = Val(elt.GetBody())
    else if lcase(name) = "title" then
      m.title = elt.GetBody()
    */
    const feed: ArDataFeed = {};
    feed.items = this.getFeedItems(rawFeed);

    // m.assetCollection = CreateObject("roAssetCollection")
    const assetList: any[] = [];
    for (const feedItem of feed.items) {
      const asset: any = {};
      asset.link = feedItem.url;
      asset.name = feedItem.url;
      asset.changeHint = feedItem.guid;
      assetList.push(asset);
    }

    // (assetPoolFetcher as any).addEventListener('fileevent', this.handleFileEvent);
    assetPoolFetcher.fileevent = this.handleFileEvent;

    assetPoolFetcher.start(assetList)
      .then(() => {
        debugger;
      })
      .catch((err) => {
        console.log(err);
        debugger;
      });

    debugger;
  }

  handleFileEvent(fileEvent: any) {
    console.log(fileEvent);
    debugger;
  }

  getDataFeeds(bsdm: DmState) {
    const dataFeedSourceIds: BsDmId[] = dmGetDataFeedSourceIdsForSign(bsdm);
    for (const dataFeedSourceId of dataFeedSourceIds) {
      this.queueRetrieveLiveDataFeed(bsdm, dataFeedSourceId);
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



