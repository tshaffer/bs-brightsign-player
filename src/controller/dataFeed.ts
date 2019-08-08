import * as fs from 'fs-extra';
import axios from 'axios';

import { DataFeed, DataFeedItem } from '../type/dataFeed';
import { DmState, BsDmId, DmcDataFeed, dmGetDataFeedById, DmDataFeedSource, DmRemoteDataFeedSource, DmParameterizedString, dmGetSimpleStringFromParameterizedString, dmGetDataFeedSourceForFeedId } from '@brightsign/bsdatamodel';
import { isNil, isObject } from 'lodash';
import { DataFeedUsageType } from '@brightsign/bscore';
import AssetPool, { Asset } from '@brightsign/assetpool';
import { xmlStringToJson } from '../utility/helpers';
import { addDataFeed } from '../model/dataFeed';
import { getFeedItems } from '../selector/dataFeed';

import AssetPoolFetcher from '@brightsign/assetpoolfetcher';
import { ArEventType } from '../..';
import { postMessage, getPlatform } from './runtime';

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

function readMrssContentSync(bsdmDataFeed: DmcDataFeed) {

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


export function readDataFeedContentSync(dataFeed: DmcDataFeed) {
  return (dispatch: any, getState: any) => {
    switch (dataFeed.usage) {
      case DataFeedUsageType.Mrss: {
        return dispatch(readMrssContentSync(dataFeed));
      }
      default:
        debugger;
        break;
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

        if (isNil(assetPoolFetcher)) {
          console.log('assetPoolFetcher does not exist, create it');
          const feedAssetPool: AssetPool = getFeedAssetPool();
          console.log('created and retrieved feedAssetPool');
          console.log(feedAssetPool);
          assetPoolFetcher = new AssetPoolFetcher(feedAssetPool);
          console.log('assetPoolFetcher created');
          console.log(assetPoolFetcher);
        }

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

// function feedIsMRSS(feedFileName: string): boolean {

//   let fileContents: string;

//   try {
//     fileContents = fs.readFileSync(feedFileName, 'utf8');
//   } catch (err) {
//     return false;
//   }

//   return true;

//   // feedXML = CreateObject("roXMLElement")
//   // if not feedXML.Parse(xml) then
//   //   return false
//   //   end if

//   // if feedXML.HasAttribute("xmlns:media") then
//   //   attrs = feedXML.GetAttributes()
//   //   if attrs["xmlns:media"] = "http://search.yahoo.com/mrss/" then
//   //   return true
//   //   end if
//   // end if

//   // return false
// }

