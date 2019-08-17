import { Asset } from '@brightsign/assetpool';

export interface DataFeed {
  id: string;
  sourceId: string;
  items: DataFeedItem[];
  assetList: Asset[];
  title?: string;
  playtime?: string;
  ttl?: string;
  isMrss?: boolean;
  articles?: string[];
  articleTitles?: string[];
  articlesByTitle?: any; // string -> string
  articleMediaTypes?: string[];
  itemUrls?: string[] | null;
  fileUrls?: string[] | null;
  fileTypes?: string[] | null;
  fileKeys?: string[] | null;
}

export interface DataFeedItem {
  description: string;
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

export interface DataFeedMap {
  [dataFeedId: string]: DataFeed;
}


export interface DataFeedContentItems {
  articles: any[];
  articleTitles: any[];
  articlesByTitle: any;
  articleMediaTypes: any[];
  // guids: string[];
}

