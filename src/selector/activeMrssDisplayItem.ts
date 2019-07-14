import { BsBrightSignPlayerState } from '../type';
import { DataFeedItem } from '../type/dataFeed';
import { BsDmId } from '@brightsign/bsdatamodel';

// ------------------------------------
// Selectors
// ------------------------------------
// TEDTODO - create selector?
export function getActiveMrssDisplayItem(state: BsBrightSignPlayerState, hsmId: string): DataFeedItem | null {
  const activeMrssDisplayItemIdByZone = state.bsPlayer.activeMrssDisplayItems;
  const activeMrssDisplayItem: DataFeedItem | null = activeMrssDisplayItemIdByZone[hsmId];
  console.log(activeMrssDisplayItem);
  return activeMrssDisplayItem;
}
