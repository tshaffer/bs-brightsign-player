import * as fs from 'fs-extra';
import axios from 'axios';

import { ArTextItem, ArTextFeed, ArMrssItem, ArMrssFeed, ArContentFeedItem, ArContentFeed, ArDataFeed } from '../type/dataFeed';
import { DmState, BsDmId, DmcDataFeed, DmDataFeedSource, DmRemoteDataFeedSource, DmParameterizedString, dmGetSimpleStringFromParameterizedString, dmGetDataFeedSourceForFeedId, dmGetDataFeedById } from '@brightsign/bsdatamodel';
import { isNil, isObject } from 'lodash';
import { DataFeedUsageType, DataFeedType } from '@brightsign/bscore';
import AssetPool, { Asset } from '@brightsign/assetpool';
import { xmlStringToJson } from '../utility/helpers';
import { addDataFeed } from '../model/dataFeed';
import { getMrssFeedItems, getFeedPoolFilePath, getDataFeedById, allDataFeedContentExists } from '../selector/dataFeed';

import AssetPoolFetcher from '@brightsign/assetpoolfetcher';
import { ArEventType } from '../type/runtime';

import { postMessage, getPlatform, getPoolFilePath } from './runtime';

let assetPoolFetcher: AssetPoolFetcher | null = null;


// ******************** FEEDS: ********************/

// Promise is resolved with the raw data feed (xml converted to json)
export function retrieveDataFeed(bsdm: DmState, dataFeed: DmcDataFeed): Promise<any> {

  const dataFeedSource = dmGetDataFeedSourceForFeedId(bsdm, { id: dataFeed.id });
  if (isNil(dataFeedSource)) {
    console.log('******** retrieveDataFeed - dataFeedSource not found.');
    // debugger;
  }

  const remoteDataFeedSource: DmRemoteDataFeedSource = dataFeedSource as DmRemoteDataFeedSource;
  const urlPS: DmParameterizedString = remoteDataFeedSource.url;
  const url: string | null = dmGetSimpleStringFromParameterizedString(urlPS);
  if (!isNil(url)) {
    return axios({
      method: 'get',
      url,
      responseType: 'text',
    }).then((response: any) => {
      fs.writeFileSync(getFeedCacheRoot() + dataFeed.id + '.xml', response.data);
      return xmlStringToJson(response.data);
    }).then((feedAsJson) => {
      console.log(feedAsJson);
      return Promise.resolve(feedAsJson);
    }).catch((err) => {
      console.log(err);
      return Promise.reject(err);
    });
  }
  return Promise.reject('dataFeedSources url is null');
}

// returns promise
export function readCachedFeed(bsdmDataFeed: DmcDataFeed): Promise<any> {

  const feedFileName: string = getFeedCacheRoot() + bsdmDataFeed.id + '.xml';

  console.log('Read existing content for feed ' + bsdmDataFeed.id);

  let xmlFileContents: string;

  try {

    xmlFileContents = fs.readFileSync(feedFileName, 'utf8');

    return xmlStringToJson(xmlFileContents)
      .then((feedAsJson) => {
        console.log(feedAsJson);
        return Promise.resolve(feedAsJson);
      }).catch((err) => {
        // TODODF - if err is for file not found
        return Promise.resolve(null);
      });
  } catch (err) {
    // return Promise.reject(err);
    // TODODF
    return Promise.resolve(null);
  }
}

export function processFeed(bsdmDataFeed: DmcDataFeed, rawFeed: any) {
  return (dispatch: any, getState: any) => {
    switch (bsdmDataFeed.usage) {
      case DataFeedUsageType.Mrss: {
        return dispatch(processCachedMrssFeed(bsdmDataFeed, rawFeed));
      }
      case DataFeedUsageType.Content: {
        return dispatch(processCachedContentFeed(bsdmDataFeed, rawFeed));
      }
      default:
        return Promise.resolve();
    }
  };

}


// ******************** MRSS FEEDS: ********************/

// return a promise
function processCachedMrssFeed(bsdmDataFeed: DmcDataFeed, rawFeed: any) {

  return (dispatch: any, getState: any) => {

    // const isMrssFeed: boolean = feedIsMrss(rawFeed);
    const isMrssFeed = true;
    if (!isMrssFeed) {
      return Promise.resolve();
    }

    const items: ArMrssItem[] = getMrssFeedItems(rawFeed);
    console.log(items);

    const assetList: Asset[] = [];
    for (const feedItem of items) {
      const asset: Asset = {
        link: feedItem.url,
        name: feedItem.url,
        changeHint: feedItem.guid,
        hash: {
          method: 'SHA1',
          hex: feedItem.guid,
        }
      };
      assetList.push(asset);
    }

    const dataFeed: ArMrssFeed = {
      type: 'mrss',
      id: bsdmDataFeed.id,
      usage: DataFeedUsageType.Mrss,
      sourceId: bsdmDataFeed.feedSourceId,
      mrssItems: items,
      assetList,
      title: 'notSure',
      playtime: '',
      ttl: '',
    };
    const addDataFeedAction: any = addDataFeed(bsdmDataFeed.id, dataFeed);
    dispatch(addDataFeedAction);
    return Promise.resolve();
  };
}

export function downloadMRSSFeedContent(arDataFeed: ArMrssFeed) {

  return (dispatch: any, getState: any) => {

    console.log(arDataFeed.mrssItems);
    console.log(arDataFeed.assetList);

    console.log('assetList created');

    console.log('***** - downloadMRSSContent, addDataFeed');
    console.log('***** - dataFeedId = ' + arDataFeed.id);
    console.log('***** - items length = ' + arDataFeed.mrssItems.length.toString());

    const dataFeed = getDataFeedById(getState(), arDataFeed.id) as ArDataFeed;

    console.log('check for existence of assetPoolFetcher');

    console.log('but even if it exists, create a new one');
    // if (isNil(assetPoolFetcher)) {
    console.log('assetPoolFetcher does not exist, create it');
    const feedAssetPool: AssetPool = getFeedAssetPool();
    console.log('created and retrieved feedAssetPool');
    console.log(feedAssetPool);
    assetPoolFetcher = new AssetPoolFetcher(feedAssetPool);
    console.log('assetPoolFetcher created');
    console.log(assetPoolFetcher);

    // assetPoolFetcher.fileevent = handleFileEvent;
    // assetPoolFetcher.progressevent = handleProgressEvent;
    assetPoolFetcher.addEventListener('progressevent', (data: any) => {
      // ProgressEvent is defined at
      // https://docs.brightsign.biz/display/DOC/assetpoolfetcher#assetpoolfetcher-Events
      console.log('progressEvent:');
      console.log(data.detail.fileName);
      console.log(data.detail.index);
      console.log(data.detail.total);
      console.log(data.detail.currentFileTransferred);
      console.log(data.detail.currentFileTotal);
    });

    assetPoolFetcher.addEventListener('fileevent', (data: any) => {
      // FileEvent is at data.detail
      // https://docs.brightsign.biz/display/DOC/assetpoolfetcher#assetpoolfetcher-Events
      console.log('fileEvent:');
      console.log(data.detail.fileName);
      console.log(data.detail.index);
      console.log(data.detail.responseCode);
    });


    console.log('post MRSS_SPEC_UPDATED message');

    // indicate that the mrss spec has been updated
    const event: ArEventType = {
      EventType: 'MRSS_SPEC_UPDATED',
      // EventData: dataFeedSource.id,
      EventData: dataFeed.id,
    };
    const action: any = postMessage(event);
    dispatch(action);

    console.log('assetPoolFetcher.start');
    assetPoolFetcher.start(arDataFeed.assetList)
      .then(() => {
        console.log('assetPoolFetcher promise resolved');

        // after all files complete
        const event: ArEventType = {
          EventType: 'MRSS_DATA_FEED_LOADED',
          // EventData: dataFeedSource.id,
          EventData: dataFeed.id,
        };
        const action: any = postMessage(event);
        dispatch(action);
      })
      .catch((err) => {
        console.log('err caught in assetPoolFetcher.start');
        console.log(err);
        debugger;
      });
  };
}


// ******************** CONTENT FEEDS: BSN & BS  ********************/

// return a promise
function processCachedContentFeed(bsdmDataFeed: DmcDataFeed, rawFeed: any) {
  return (dispatch: any, getState: any) => {
    return dispatch(loadContentFeed(bsdmDataFeed, rawFeed));
  };
}

// returns a promise - verify
function loadContentFeed(bsdmDataFeed: DmcDataFeed, rawFeed: any) {

  return (dispatch: any, getState: any) => {

    if (isBsnFeed(bsdmDataFeed)) {
      return dispatch(processBsnContentFeed(bsdmDataFeed, rawFeed));
    }
    else {
      dispatch(processUrlContentFeed(bsdmDataFeed, rawFeed));
      return Promise.resolve();
    }
  };
}

function massageStoredContentFeed(arDataFeed: ArContentFeed) {

  return (dispatch: any, getState: any) => {

    const assetList: Asset[] = [];

    let index = 0;
    for (const contentItem of arDataFeed.contentItems) {

      const asset: Asset = {
        link: contentItem.url,
        name: contentItem.name,
        changeHint: contentItem.hash,
        hash: {
          method: 'SHA1',
          hex: contentItem.hash,
        }
      };

      assetList.push(asset);
      index++;
    }

    arDataFeed.assetList = assetList;

    if (allDataFeedContentExists(arDataFeed)) {
      console.log('allDataFeedContentExists returned true');
      // post message indicating load complete
      const event: ArEventType = {
        EventType: 'CONTENT_DATA_FEED_LOADED',
        EventData: arDataFeed.id,
      };
      const action: any = postMessage(event);
      dispatch(action);
    }
    else {
      console.log('allDataFeedContentExists returned false');
    }
  };
}

export function downloadContentFeedContent(arDataFeed: ArContentFeed) {
  // feed should already exist at this point and be on the card
  return (dispatch: any, getState: any) => {

    console.log('downloadContentFeedContent - entry');

    const assetList: Asset[] = [];

    const its = arDataFeed.contentItems;
    for (const contentFeedItem of its) {

      console.log('create Asset');
      console.log(contentFeedItem.name);
      console.log(contentFeedItem.url);
      console.log(contentFeedItem.hash);

      const asset: Asset = {
        name: contentFeedItem.name,
        link: contentFeedItem.url,
        changeHint: contentFeedItem.hash,
        hash: {
          method: 'SHA1',
          hex: contentFeedItem.hash,
        }
      };
      assetList.push(asset);
    }
    console.log('assetList created');
    console.log(assetList);

    const feedAssetPool: AssetPool = getFeedAssetPool();
    assetPoolFetcher = new AssetPoolFetcher(feedAssetPool);

    assetPoolFetcher.addEventListener('progressevent', (data: any) => {
      console.log('progressEvent:');
      console.log(data.detail.fileName);
      console.log(data.detail.index);
      console.log(data.detail.total);
      console.log(data.detail.currentFileTransferred);
      console.log(data.detail.currentFileTotal);
    });

    assetPoolFetcher.addEventListener('fileevent', (data: any) => {
      // FileEvent is at data.detail
      // https://docs.brightsign.biz/display/DOC/assetpoolfetcher#assetpoolfetcher-Events
      console.log('fileEvent:');
      console.log(data.detail.fileName);
      console.log(data.detail.index);
      console.log(data.detail.responseCode);
    });

    console.log('assetPoolFetcher.start');
    assetPoolFetcher.start(assetList)
      .then(() => {

        console.log('assetPoolFetcher promise resolved');

        // post message indicating load complete
        const event: ArEventType = {
          EventType: 'CONTENT_DATA_FEED_LOADED',
          EventData: arDataFeed.id,
        };
        console.log('POST CONTENT_DATA_FEED_LOADED');
        const action: any = postMessage(event);
        dispatch(action);
      })
      .catch((err) => {
        console.log('err caught in assetPoolFetcher.start');
        console.log(err);
      });
  };
}


// ******************** BSN CONTENT FEED ********************/

// returns a promise
function processBsnContentFeed(bsdmDataFeed: DmcDataFeed, rawFeed: any) {
  return (dispatch: any, getState: any) => {
    return parseMrssFeed(rawFeed)
      .then((mrssItems: ArMrssItem[]) => {
        const contentItems: ArContentFeedItem[] = convertMrssFormatToContentFormat(mrssItems);
        const arContentFeed: ArContentFeed = {
          type: 'contentFeed',
          id: bsdmDataFeed.id,
          sourceId: bsdmDataFeed.feedSourceId,
          usage: DataFeedUsageType.Content,
          contentItems,
        };
        const addDataFeedAction: any = addDataFeed(bsdmDataFeed.id, arContentFeed);
        dispatch(addDataFeedAction);
        return Promise.resolve();
      });
  };
}

function parseMrssFeed(rawFeed: any) {
  const promise = populateFeedItems(rawFeed);
  return promise.then((mrssItems: ArMrssItem[]) => {
    return Promise.resolve(mrssItems);
  });
}

function populateFeedItems(rawFeed: any): any {
  const items: ArMrssItem[] = getMrssFeedItems(rawFeed);
  return Promise.resolve(items);
}

// convert to format required for content feed
function convertMrssFormatToContentFormat(mrssItems: ArMrssItem[]): ArContentFeedItem[] {
  const contentItems: ArContentFeedItem[] = [];
  for (const mrssItem of mrssItems) {
    const arContentItem: ArContentFeedItem = {
      name: mrssItem.title,
      url: mrssItem.url,
      medium: mrssItem.medium,
      hash: mrssItem.guid,
    };
    contentItems.push(arContentItem);
  }
  return contentItems;
}


// ******************** URL CONTENT FEED ********************/

// returns a promise
function processUrlContentFeed(bsdmDataFeed: DmcDataFeed, urlFeed: any) {

  return (dispatch: any, getState: any) => {
    // TODO - can buildContentFeed return the arDataFeed it just created?
    dispatch(buildContentFeedFromUrlFeed(bsdmDataFeed, urlFeed));
    const arDataFeed = getDataFeedById(getState(), bsdmDataFeed.id) as ArDataFeed;
    if (!isNil(arDataFeed)) {
      // NO REAL NEED TO CALL THIS IF FEED WAS NOT CACHED
      dispatch(massageStoredContentFeed(arDataFeed as ArContentFeed));
      // DOES READ LAUNCH A DOWNLOAD?
      //    NO
      // THIS THREAD IS DONE!!
    }
  };
}

function buildContentFeedFromUrlFeed(bsdmDataFeed: DmcDataFeed, urlFeed: any) {
  return (dispatch: any, getState: any) => {
    const contentItems: ArContentFeedItem[] = [];
    for (const item of urlFeed.rss.channel.item) {
      const arContentItem: ArContentFeedItem = {
        name: item.title,
        url: item.description,
        medium: item.medium,
        hash: item.guid,
      };
      contentItems.push(arContentItem);
    }

    const arContentFeed: ArContentFeed = {
      type: 'contentFeed',
      id: bsdmDataFeed.id,
      sourceId: bsdmDataFeed.feedSourceId,
      usage: DataFeedUsageType.Content,
      contentItems,
    };
    const addDataFeedAction: any = addDataFeed(bsdmDataFeed.id, arContentFeed);
    dispatch(addDataFeedAction);
  };
}

// ******************** TEXT FEED  ********************/

export function parseSimpleRSSFeed(bsdm: DmState, rawXmlTextFeed: any, dataFeedId: BsDmId) {

  return (dispatch: any, getState: any) => {

    // const articles: string[] = [];
    // const articleTitles: string[] = [];
    const textItems: ArTextItem[] = [];
    const articlesByTitle: any = {};

    for (const feedItem of rawXmlTextFeed.rss.channel.item) {
      const title: string = feedItem.title;
      const description: string = feedItem.description;

      const arTextItem: ArTextItem = {
        articleTitle: title,
        articleDescription: description,
      };
      textItems.push(arTextItem);

      // articles.push(description);
      // articleTitles.push(title);
      articlesByTitle[title] = description;
    }

    const dmDataFeed: DmcDataFeed = dmGetDataFeedById(bsdm, { id: dataFeedId }) as DmcDataFeed;
    const dataFeed: ArTextFeed = {
      type: 'textFeed',
      id: dataFeedId,
      usage: DataFeedUsageType.Text,
      sourceId: dmDataFeed.feedSourceId,
      textItems,
      articlesByTitle,
    };

    const addDataFeedAction: any = addDataFeed(dataFeedId, dataFeed);
    dispatch(addDataFeedAction);
  };
}

// ******************** UTILIES / SHARED ********************/

export function getFeedCacheRoot(): string {
  switch (getPlatform()) {
    case 'Desktop':
    default:
      return '/Users/tedshaffer/Desktop/autotron/feed_cache/';
    case 'BrightSign':
      return 'feed_cache/';
  }
}

function getFeedAssetPool(): AssetPool {
  switch (getPlatform()) {
    case 'Desktop':
    default:
      return new AssetPool('/Users/tedshaffer/Desktop/autotron/feedPool');
    case 'BrightSign':
      return new AssetPool('SD:/feedPool');
  }
}

function isBsnFeed(bsdmDataFeed: DmcDataFeed): boolean {
  // return true;
  return (bsdmDataFeed.isBsnDataFeed && (bsdmDataFeed.type === DataFeedType.BSNDynamicPlaylist || bsdmDataFeed.type === DataFeedType.BSNMediaFeed));
}

function fsSaveObjectAsLocalJsonFile(data: object, fullPath: string): Promise<void> {
  const jsonString = JSON.stringify(data, null, 2);
  console.log('invoke fs.writeFile');
  console.log(fullPath);
  return fs.writeFile(fullPath, jsonString);
}

function handleFileEvent(fileEvent: any) {
  console.log('handleFileEvent');
  console.log(fileEvent);
}

function handleProgressEvent(progressEvent: any) {
  console.log('handleProgressEvent');
  console.log(progressEvent);
}

export function feedIsMrss(feed: any): boolean {

  if (isObject(feed) && isObject(feed.rss) && isObject(feed.rss.$)) {
    if (feed.rss.$.hasOwnProperty('xmlns:media')) {
      const attr: string = feed.rss.$['xmlns:media'];
      if (attr.startsWith('http://search.yahoo.com/mrss')) {
        return true;
      }
    }
  }

  return false;
}

