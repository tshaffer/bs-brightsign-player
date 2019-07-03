import { Asset } from '@brightsign/assetpool';

export interface DataFeed {
  id: string;
  title?: string;
  playtime?: string;
  ttl?: string;
  items: DataFeedItem[];
  assetList: Asset[];
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
}

export interface DataFeedMap {
  [dataFeedId: string]: DataFeed;
}
