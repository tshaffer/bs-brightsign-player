import * as fs from 'fs-extra';
import axios from 'axios';

import { DataFeed, DataFeedItem } from '../type/dataFeed';
import { DmState, BsDmId, DmcDataFeed, dmGetDataFeedById, DmDataFeedSource, DmRemoteDataFeedSource, DmParameterizedString, dmGetSimpleStringFromParameterizedString } from '@brightsign/bsdatamodel';
import { isNil } from 'lodash';
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

export function readFeedContent(bsdm: DmState, dataFeedId: BsDmId) {

  return (dispatch: any, getState: any) => {

    const dataFeed: DmcDataFeed | null = dmGetDataFeedById(bsdm, { id: dataFeedId });

    if (!isNil(dataFeed)) {
      if (dataFeed.usage === DataFeedUsageType.Mrss) {
        const mrssContent: any = readMrssContent(dataFeed);
        const promise: any = dispatch(mrssContent);
        return promise;
        // dispatch(this.readMrssContent(dataFeed));
      }
      else {
        // ReadLiveFeedContent()
      }
    }

    // dispatch(this.queueRetrieveLiveDataFeed(bsdm, dataFeedSourceId));
  };
}

function readMrssContent(bsdmDataFeed: DmcDataFeed) {

  return (dispatch: any, getState: any) => {

    return new Promise((resolve, reject) => {

      const feedFileName: string = getFeedCacheRoot() + bsdmDataFeed.feedSourceId + '.xml';
      const isMrssFeed: boolean = feedIsMRSS(feedFileName);
      //   if not m.isMRSSFeed and m.parser$ = "" then
      if (!isMrssFeed) {
        return resolve();
      }

      console.log('Read existing content for feed ' + bsdmDataFeed.feedSourceId);

      let xmlFileContents: string;

      try {
        xmlFileContents = fs.readFileSync(feedFileName, 'utf8');
        xmlStringToJson(xmlFileContents)
          .then((rawFeed) => {
            const items: DataFeedItem[] = getFeedItems(rawFeed);
            console.log(items);

            const assetList: Asset[] = [];
            for (const feedItem of items) {

              // console.log('hash hex:');
              // console.log(feedItem.guid);

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
              id: bsdmDataFeed.feedSourceId,
              sourceId: bsdmDataFeed.feedSourceId,
              assetList,
              items,
            };
            const addDataFeedAction: any = addDataFeed(bsdmDataFeed.feedSourceId, dataFeed);
            dispatch(addDataFeedAction);
            return resolve();
          });

      } catch (err) {
        return reject(err);
      }
    });
  };
}

function fsSaveObjectAsLocalJsonFile(data: object, fullPath: string): Promise<void> {
  const jsonString = JSON.stringify(data, null, 2);
  console.log('invoke fs.writeFile');
  console.log(fullPath);
  return fs.writeFile(fullPath, jsonString);
}


export function retrieveLiveDataFeed(bsdm: DmState, dataFeedSource: DmDataFeedSource): Promise<any> {

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
        fs.writeFileSync(getFeedCacheRoot() + dataFeedSource.id + '.xml', response.data);
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


export function downloadMRSSContent(rawFeed: any, dataFeedSource: DmDataFeedSource) {

  return (dispatch: any, getState: any) => {

    // write the mrss feed to the card
    fsSaveObjectAsLocalJsonFile(rawFeed, getFeedCacheRoot() + dataFeedSource.id + '.json')
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

          console.log('hash hex:');
          console.log(feedItem.guid);

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
          id: dataFeedSource.id,
          sourceId: dataFeedSource.id,
          assetList,
          items,
        };
        dispatch(addDataFeed(dataFeedSource.id, dataFeed));

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

        assetPoolFetcher.fileevent = handleFileEvent;
        assetPoolFetcher.progressevent = handleProgressEvent;

        console.log('assetPoolFetcher.start');
        assetPoolFetcher.start(assetList)
          .then(() => {
            console.log('assetPoolFetcher promise resolved');

            // after all files complete
            const event: ArEventType = {
              EventType: 'MRSS_DATA_FEED_LOADED',
              EventData: dataFeedSource.id,
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


function feedIsMRSS(feedFileName: string): boolean {

  let fileContents: string;

  try {
    fileContents = fs.readFileSync(feedFileName, 'utf8');
  } catch (err) {
    return false;
  }

  return true;

  // feedXML = CreateObject("roXMLElement")
  // if not feedXML.Parse(xml) then
  //   return false
  //   end if

  // if feedXML.HasAttribute("xmlns:media") then
  //   attrs = feedXML.GetAttributes()
  //   if attrs["xmlns:media"] = "http://search.yahoo.com/mrss/" then
  //   return true
  //   end if
  // end if

  // return false
}

