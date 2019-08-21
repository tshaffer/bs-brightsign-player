
import { Asset } from '@brightsign/assetpool';
import { BsDmId } from '@brightsign/bsdatamodel';
import { DataFeedUsageType } from '@brightsign/bscore';

export interface ArDataFeedBase {
  id: BsDmId;
  sourceId: BsDmId;
  usage: DataFeedUsageType;
}

export interface ArTextItem {
  articleTitle: string;
  articleDescription: string;
}

export interface ArTextFeedProperties {
  textItems: ArTextItem[];
  articlesByTitle: any; // title => ArTextItem
}

export interface ArMrssItem {
  guid: string;
  link: string;
  title: string;
  pubDate: string;
  duration: string;
  fileSize: string;
  medium: string;
  type: string;
  url: string;
  filePath?: string;
}

export interface ArMrssFeedProperties {
  mrssItems: ArMrssItem[];
  assetList: Asset[];
  title: string;
  playtime: string;
  ttl: string;
}

export interface ArContentItem {
  filePath: string;
  itemUrl: string;
  guid: string;
  medium: string;
}

export interface  ArContentFeedItem {
  article: string;
  articleTitle: string;
  guid: string;
  medium: string;
}

export interface ArContentFeedProperties {
  contentItems: ArContentFeedItem[];
  assetList?: Asset[];
}

export interface ArMediaFeedItem {
  filePath: string;
  medium: string;
}

export type ArDataFeed = ArTextFeed | ArMediaFeed;

export type ArTextFeed = ArDataFeedBase & ArTextFeedProperties;
export type ArMediaFeed = ArMrssFeed | ArContentFeed;

export type ArMrssFeed = ArDataFeedBase & ArMrssFeedProperties;
export type ArContentFeed = ArDataFeedBase & ArContentFeedProperties;

export interface ArDataFeedMap {
  [dataFeedId: string]: ArDataFeed;
}

// export interface DataFeed {
//   id: string;
//   sourceId: string;
//   items?: DataFeedItem[];
//   assetList?: Asset[];
//   title?: string;
//   playtime?: string;
//   ttl?: string;
//   isMrss?: boolean;
//   articles?: string[];
//   articleTitles?: string[];
//   articlesByTitle?: any; // string -> string
//   articleMediaTypes?: string[];
//   itemUrls?: string[] | null;
//   fileUrls?: string[] | null;
//   fileTypes?: string[] | null;
//   fileKeys?: string[] | null;
// }

// export interface DataFeedItem {
//   description: string;
//   guid: string;
//   link: string;
//   title: string;
//   pubDate: string;
//   duration: string;
//   fileSize: string;
//   medium: string;
//   type: string;
//   url: string;
//   filePath?: string;
// }

// export interface DataFeedMap {
//   [dataFeedId: string]: DataFeed;
// }


// export interface DataFeedContentItems {
//   articles: any[];
//   articleTitles: any[];
//   articlesByTitle: any;
//   articleMediaTypes: any[];
//   // guids: string[];
// }

