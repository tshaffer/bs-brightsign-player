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
