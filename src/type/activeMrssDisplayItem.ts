import { DataFeedItem } from './dataFeed';

export interface MrssDisplayItemMap {
  [hsmId: string]: DataFeedItem | null;
}