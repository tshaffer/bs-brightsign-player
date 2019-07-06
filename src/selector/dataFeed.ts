import { BsBrightSignPlayerState } from '../type';
import { DataFeed, DataFeedItem } from '../type/dataFeed';

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
  debugger;
  return false;
}

export function contentExists(dataFeed: DataFeed): boolean {
  debugger;
  return false;
}
