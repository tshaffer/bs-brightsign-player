import * as fs from 'fs-extra';
import axios from 'axios';

import { DataFeed, DataFeedItem, DataFeedContentItems } from '../type/dataFeed';
import { DmState, BsDmId, DmcDataFeed, DmDataFeedSource, DmRemoteDataFeedSource, DmParameterizedString, dmGetSimpleStringFromParameterizedString, dmGetDataFeedSourceForFeedId, dmGetDataFeedById } from '@brightsign/bsdatamodel';
import { isNil, isObject } from 'lodash';
import { DataFeedUsageType } from '@brightsign/bscore';
import AssetPool, { Asset } from '@brightsign/assetpool';
import { xmlStringToJson } from '../utility/helpers';
import { addDataFeed } from '../model/dataFeed';
import { getFeedItems, getFeedPoolFilePath } from '../selector/dataFeed';

import AssetPoolFetcher from '@brightsign/assetpoolfetcher';
import { ArEventType } from '../type/runtime';

import { postMessage, getPlatform, getPoolFilePath } from './runtime';

let assetPoolFetcher: AssetPoolFetcher | null = null;

function getFeedCacheRoot(): string {
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

function readStoredContentFeed(bsdmDataFeed: DmcDataFeed) {
  return (dispatch: any, getState: any) => {
    console.log(bsdmDataFeed);

    // TODOML - currently only implemented for a bsn dynamic playlist
    const feedFileName: string = getFeedCacheRoot() + bsdmDataFeed.id + '.xml';

    console.log('Read existing content for feed ' + bsdmDataFeed.id);

    let xmlFileContents: string;

    try {

      xmlFileContents = fs.readFileSync(feedFileName, 'utf8');

      return xmlStringToJson(xmlFileContents)
        .then((rawFeed) => {

          const isMrssFeed: boolean = feedIsMrss(rawFeed);
          if (!isMrssFeed) {
            return Promise.resolve();
          }

          const items: DataFeedItem[] = getFeedItems(rawFeed);
          console.log(items);

          const dataFeedContentItems: DataFeedContentItems = convertMRSSFormatToContent(items);

          let itemUrls: string[] | null = dataFeedContentItems.articles;
          let fileUrls: string[] | null = dataFeedContentItems.articles;
          let fileTypes: string[] | null = dataFeedContentItems.articleMediaTypes;

          let fileKeys: string[] | null = [];
          if (dataFeedContentItems.articleTitles.length > 0) {
            fileKeys = dataFeedContentItems.articleTitles;
          }
          else {
            for (const key of dataFeedContentItems.articlesByTitle) {
              // find the corresponding url by linearly searching through m.articles
              let index = 0;
              const url = dataFeedContentItems.articlesByTitle[key];
              for (const articleUrl of dataFeedContentItems.articles) {
                if (articleUrl === url) {
                  fileKeys[index] = key;
                }
                index++;
              }
            }
          }

          const assetList: Asset[] = [];
          let index = 0;
          for (const url of fileUrls) {
            const guid = items[index].guid;
            const asset: Asset = {
              link: url,
              name: url,
              changeHint: guid,
              hash: {
                method: 'SHA1',
                hex: guid,
              }
            };
            assetList.push(asset);
            index++;
          }

          // verify that all specified files are actually on the card
          for (const asset of assetList) {
            const poolFilePath: string = getFeedPoolFilePath(asset.changeHint);
            if (poolFilePath === '') {
              // mark data structures as invalid
              itemUrls = null;
              fileKeys = null;
              fileUrls = null;

              break;
            }
          }

          // post message indicating load complete
          const event: ArEventType = {
            EventType: 'CONTENT_DATA_FEED_LOADED',
            EventData: bsdmDataFeed.id,
          };
          const action: any = postMessage(event);
          dispatch(action);

          const dataFeed: DataFeed = {
            id: bsdmDataFeed.id,
            sourceId: bsdmDataFeed.feedSourceId,
            assetList,
            items,
            isMrss: true,
            articles: dataFeedContentItems.articles,
            articleTitles: dataFeedContentItems.articleTitles,
            articlesByTitle: dataFeedContentItems.articlesByTitle,
            articleMediaTypes: dataFeedContentItems.articleMediaTypes,
            itemUrls,
            fileUrls,
            fileTypes,
            fileKeys,

          };
          const addDataFeedAction: any = addDataFeed(bsdmDataFeed.id, dataFeed);
          dispatch(addDataFeedAction);

          return Promise.resolve();
        }).catch((err) => {
          debugger;
        });
    } catch (err) {
      // return Promise.reject(err);
      // TODODF
      return Promise.resolve();
    }
  };
}

function convertMRSSFormatToContent(items: DataFeedItem[]): DataFeedContentItems {

  // convert to format required for content feed
  const articles: string[] = [];
  const articleTitles: string[] = [];
  const articlesByTitle: any = {};
  const articleMediaTypes: string[] = [];

  for (const item of items) {
    articles.push(item.url);
    articleTitles.push(item.title);
    articlesByTitle[item.title] = item.url;
    articleMediaTypes.push(item.medium);
  }

  const feedContentItems: DataFeedContentItems = {
    articles,
    articleTitles,
    articlesByTitle,
    articleMediaTypes,
  };

  return feedContentItems;
}

function readStoredMrssFeed(bsdmDataFeed: DmcDataFeed) {

  return (dispatch: any, getState: any) => {

    const feedFileName: string = getFeedCacheRoot() + bsdmDataFeed.id + '.xml';

    console.log('Read existing content for feed ' + bsdmDataFeed.id);

    let xmlFileContents: string;

    try {

      xmlFileContents = fs.readFileSync(feedFileName, 'utf8');

      return xmlStringToJson(xmlFileContents)
        .then((rawFeed) => {

          const isMrssFeed: boolean = feedIsMrss(rawFeed);
          if (!isMrssFeed) {
            return Promise.resolve();
          }

          const items: DataFeedItem[] = getFeedItems(rawFeed);
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

          const dataFeed: DataFeed = {
            id: bsdmDataFeed.id,
            sourceId: bsdmDataFeed.feedSourceId,
            assetList,
            items,
            isMrss: true,
          };
          const addDataFeedAction: any = addDataFeed(bsdmDataFeed.id, dataFeed);
          dispatch(addDataFeedAction);
          return Promise.resolve();
        }).catch((err) => {
          // TODODF - if err is for file not found
          return Promise.resolve();
        });
    } catch (err) {
      // return Promise.reject(err);
      // TODODF
      return Promise.resolve();
    }
  };
}

export function readStoredDataFeed(bsdmDataFeed: DmcDataFeed) {
  return (dispatch: any, getState: any) => {
    switch (bsdmDataFeed.usage) {
      case DataFeedUsageType.Mrss: {
        return dispatch(readStoredMrssFeed(bsdmDataFeed));
      }
      case DataFeedUsageType.Content: {
        return dispatch(readStoredContentFeed(bsdmDataFeed));
      }
      default:
        return Promise.resolve();
    }
  };
}

function fsSaveObjectAsLocalJsonFile(data: object, fullPath: string): Promise<void> {
  const jsonString = JSON.stringify(data, null, 2);
  console.log('invoke fs.writeFile');
  console.log(fullPath);
  return fs.writeFile(fullPath, jsonString);
}

export function retrieveDataFeed(bsdm: DmState, dataFeed: DmcDataFeed): Promise<any> {

  // TODODF - authentication
  // TODODF - headRequest
  // TODODF - user agent string
  // TODODF - binding


  // simplified version - URL only; simple string
  // TODODF - data feed source with user variable?
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

export function downloadFeedContent() {
  return (dispatch: any, getState: any) => {
    debugger;
  };
}

export function downloadMRSSContent(bsdm: DmState, rawFeed: any, dataFeedId: BsDmId) {

  return (dispatch: any, getState: any) => {

    const dataFeedSource = dmGetDataFeedSourceForFeedId(bsdm, { id: dataFeedId }) as DmDataFeedSource;

    // write the mrss feed to the card
    fsSaveObjectAsLocalJsonFile(rawFeed, getFeedCacheRoot() + dataFeedId + '.json')
      .then(() => {

        /* feed level properties
        if name = "ttl" then
          m.SetTTLMinutes(elt.GetBody())
        else if name = "frameuserinfo:playtime" then
          m.playtime = Val(elt.GetBody())
        else if lcase(name) = "title" then
          m.title = elt.GetBody()
        */
        const items: DataFeedItem[] = getFeedItems(rawFeed);

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

        console.log('assetList created');

        console.log('***** - downloadMRSSContent, addDataFeed');
        console.log('***** - dataFeedId = ' + dataFeedId);
        console.log('***** - items length = ' + items.length.toString());

        const dataFeed: DataFeed = {
          // id: dataFeedSource.id,
          id: dataFeedId,
          sourceId: dataFeedSource.id,
          assetList,
          items,
          isMrss: true,
        };
        dispatch(addDataFeed(dataFeedId, dataFeed));

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
        // }

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
        assetPoolFetcher.start(assetList)
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
      });
  };
}

function handleFileEvent(fileEvent: any) {
  console.log('handleFileEvent');
  console.log(fileEvent);

  // after all files complete
  // const event = {
  //   EventType: 'MRSS_DATA_FEED_LOADED',
  //   Name: 'TBD' // m.sourceId$ - HandleLiveDataFeedContentDownloadAssetFetcherEvent
  // };
  // dispatch(this.postMessage(event));

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

export function parseSimpleRSSFeed(bsdm: DmState, rawFeed: any, dataFeedId: BsDmId) {

  return (dispatch: any, getState: any) => {

    const articles: string[] = [];
    const articleTitles: string[] = [];
    const articlesByTitle: any = {};

    for (const feedItem of rawFeed.rss.channel.item) {
      const title: string = feedItem.title;
      const description: string = feedItem.description;

      articles.push(description);
      articleTitles.push(title);
      articlesByTitle[title] = description;
    }

    const dmDataFeed: DmcDataFeed = dmGetDataFeedById(bsdm, { id: dataFeedId }) as DmcDataFeed;
    const dataFeed: DataFeed = {
      id: dataFeedId,
      sourceId: dmDataFeed.feedSourceId,
      isMrss: false,
      articles,
      articleTitles,
      articlesByTitle,
    };

    const addDataFeedAction: any = addDataFeed(dataFeedId, dataFeed);
    dispatch(addDataFeedAction);
  }
}
