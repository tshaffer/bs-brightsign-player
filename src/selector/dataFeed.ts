import * as fs from 'fs-extra';
import isomorphicPath from 'isomorphic-path';
import { BsBrightSignPlayerState } from '../type';
import { DataFeed, DataFeedItem } from '../type/dataFeed';
import { Hash, Asset } from '@brightsign/assetpool';
import { getFeedDirectory as getFeedPoolDirectory } from '../controller';

// ------------------------------------
// Selectors
// ------------------------------------
// TEDTODO - create selector?
export function getDataFeedById(state: BsBrightSignPlayerState, dataFeedId: string): DataFeed | null {
  const dataFeedsById = state.bsPlayer.dataFeeds;
  return dataFeedsById[dataFeedId];
}

export function getFeedItems(feed: any): DataFeedItem[] {

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

export function allDataFeedContentExists(dataFeed: DataFeed): boolean {
  for (const asset of dataFeed.assetList as Asset[]) {
    const filePath = getFeedPoolFilePathFromAsset(asset);
    if (filePath === '' || !fs.existsSync(filePath)) {
      return false;
    }
  }
  return true;
}

export function dataFeedContentExists(dataFeed: DataFeed): boolean {
  for (const asset of dataFeed.assetList as Asset[]) {
    const filePath = getFeedPoolFilePathFromAsset(asset);
    if (filePath !== '' && fs.existsSync(filePath)) {
      return true;
    }
  }
  return false;
}

export function getFeedPoolFilePathFromAsset(asset: Asset): string {

  const hash = asset.hash as Hash;
  if (hash.method !== 'SHA1') {
    return '';
  }
  return getFeedPoolFilePath(hash.hex);
}

export function getFeedPoolFilePath(hashValue: string): string {
  const feedPoolDirectory = getFeedPoolDirectory();
  const hashValueLength = hashValue.length;
  const dir1 = hashValue.substring(hashValueLength - 2, hashValueLength - 1);
  const dir2 = hashValue.substring(hashValueLength - 1, hashValueLength);
  const feedFileName = 'sha1-' + hashValue;
  return isomorphicPath.join(feedPoolDirectory, dir1, dir2, feedFileName);
}
