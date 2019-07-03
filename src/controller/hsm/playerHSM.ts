import * as fs from 'fs-extra';

import axios from 'axios';
import { HSM, HState, STTopEventHandler } from './HSM';
import { ArEventType, HSMStateData } from '../../type/runtime';
import { Action } from 'redux';
import { DmState, BsDmId, dmGetDataFeedSourceIdsForSign, dmGetDataFeedSourceForFeedSourceId, DmDataFeedSource, DmRemoteDataFeedSource, DmParameterizedString, dmGetSimpleStringFromParameterizedString } from '@brightsign/bsdatamodel';
import { isNil, isString } from 'lodash';
import { xmlStringToJson } from '../../utility/helpers';

import AssetPool, { Asset } from '@brightsign/assetpool';
import AssetPoolFetcher from '@brightsign/assetpoolfetcher';
import { DataFeedItem, DataFeed } from '../../type/dataFeed';
import { addDataFeed } from '../../model/dataFeed';
// import AssetRealizer from '@brightsign/assetrealizer';
// const assetPool: AssetPool = new AssetPool('/Users/tedshaffer/Desktop/autotron/feedPool');
const feedAssetPool: AssetPool = new AssetPool('SD:/feedPool');
const assetPoolFetcher = new AssetPoolFetcher(feedAssetPool);

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
          fs.writeFileSync('feed_cache/' + dataFeedSource.id + '.xml', response.data);
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

  queueRetrieveLiveDataFeed(bsdm: DmState, dataFeedSourceId: BsDmId): Function {

    return (dispatch: any, getState: any) => {
      // TODO - download feeds that are neither MRSS nor content immediately (simple RSS)
      this.dataFeedsToDownload.set(dataFeedSourceId, null);
      if (this.dataFeedsToDownload.size === 1) {
        const dataFeedSource: DmDataFeedSource | null = dmGetDataFeedSourceForFeedSourceId(bsdm, { id: dataFeedSourceId });
        if (!isNil(dataFeedSource)) {
          this.retrieveLiveDataFeed(bsdm, dataFeedSource)
            .then((feedAsJson) => {
              console.log('promise resolved from retrieveLiveDataFeed');
              console.log(feedAsJson);
              // simplified
              // DownloadMRSSContent
              dispatch(this.downloadMRSSContent(feedAsJson, dataFeedSource));
            });
        }
      }
    };
  }

  getFeedItems(feed: any): DataFeedItem[] {

    const feedItems: DataFeedItem[] = [];

    const items: any = feed.rss.channel.item;
    for (const item of items) {
      const mediaContent: any = item['media:content'].$;
      const feedItem: DataFeedItem = {
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

  fsSaveObjectAsLocalJsonFile(data: object, fullPath: string): Promise<void> {
    const jsonString = JSON.stringify(data, null, 2);
    console.log('invoke fs.writeFile');
    console.log(fullPath);
    return fs.writeFile(fullPath, jsonString);
  }

  downloadMRSSContent(rawFeed: any, dataFeedSource: DmDataFeedSource) {

    return (dispatch: any, getState: any) => {

      // write the mrss feed to the card
      this.fsSaveObjectAsLocalJsonFile(rawFeed, 'feed_cache/' + dataFeedSource.id + '.json')
        .then(() => {

          /* feed level properties
          if name = "ttl" then
            m.SetTTLMinutes(elt.GetBody())
          else if name = "frameuserinfo:playtime" then
            m.playtime = Val(elt.GetBody())
          else if lcase(name) = "title" then
            m.title = elt.GetBody()
          */
          const items: DataFeedItem[] = this.getFeedItems(rawFeed);
          
          // m.assetCollection = CreateObject("roAssetCollection")
          const assetList: Asset[] = [];
          for (const feedItem of items) {
            const asset: Asset = {
              link: feedItem.url,
              name: feedItem.url,
              changeHint: feedItem.guid,
              };
            assetList.push(asset);
          }

          const dataFeed: DataFeed = {
            id: dataFeedSource.id,
            assetList,
            items,
          };
          dispatch(addDataFeed(dataFeedSource.id, dataFeed));

          assetPoolFetcher.fileevent = this.handleFileEvent;
          assetPoolFetcher.progressevent = this.handleProgressEvent;

          console.log('assetPoolFetcher.start');
          assetPoolFetcher.start(assetList)
            .then(() => {
              console.log('assetPoolFetcher promise resolved');
            })
            .catch((err) => {
              console.log(err);
              debugger;
            });
        });
    };
  }

  handleFileEvent(fileEvent: any) {
    console.log('handleFileEvent');
    console.log(fileEvent);

    // after all files complete
    // const event = {
    //   EventType: 'MRSS_DATA_FEED_LOADED',
    //   Name: 'TBD' // m.sourceId$ - HandleLiveDataFeedContentDownloadAssetFetcherEvent
    // };
    // dispatch(this.postMessage(event));

  }

  handleProgressEvent(progressEvent: any) {
    console.log('handleProgressEvent');
    console.log(progressEvent);
  }

  addDataFeeds(bsdm: DmState): Function {
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

        // initiate data feed downloads
        dispatch(this.addDataFeeds(getState().bsdm));

        // launch playback
        const action: any = (this.stateMachine as PlayerHSM).startPlayback();
        dispatch(action);

        return 'HANDLED';

        // if event["EventType"] = "MRSS_DATA_FEED_LOADED" or event["EventType"] = "CONTENT_DATA_FEED_LOADED" or event["EventType"] = "CONTENT_DATA_FEED_UNCHANGED" then
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



