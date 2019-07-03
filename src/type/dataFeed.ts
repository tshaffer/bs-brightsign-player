export interface DataFeed {
  title?: string;
  playtime?: string;
  ttl?: string;
  items?: DataFeedItem[];
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
