import { BsBrightSignPlayerState } from '../type';
import { BsDmId } from '@brightsign/bsdatamodel';
import { ArMrssItem } from '../type/dataFeed';

// ------------------------------------
// Selectors
// ------------------------------------
// TEDTODO - create selector?
export function getActiveMrssDisplayItem(state: BsBrightSignPlayerState, zoneId: string): ArMrssItem | null {
  const activeMrssDisplayItemIdByZone = state.bsPlayer.activeMrssDisplayItems;
  const activeMrssDisplayItem: ArMrssItem | null = activeMrssDisplayItemIdByZone[zoneId];
  return activeMrssDisplayItem;
}
