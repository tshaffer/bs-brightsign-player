import { BsBrightSignPlayerState } from '../type';
import { DataFeed } from '../type/dataFeed';

// ------------------------------------
// Selectors
// ------------------------------------
// TEDTODO - create selector?
export function getDataFeedById(state: BsBrightSignPlayerState, dataFeedId: string): DataFeed | null {
  const dataFeedsById = state.bsPlayer.dataFeeds;
  return dataFeedsById[dataFeedId];
}
