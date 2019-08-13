import { BsBrightSignPlayerState } from '../type';
import { BsDmId, DmMediaContentItem } from '@brightsign/bsdatamodel';

// ------------------------------------
// Selectors
// ------------------------------------
// TEDTODO - create selector?
export function getActiveMediaListDisplayItem(state: BsBrightSignPlayerState, zoneId: string): DmMediaContentItem | null {
  const activeMediaListDisplayItemIdByZone = state.bsPlayer.activeMediaListDisplayItems;
  const activeMediaListDisplayItem: DmMediaContentItem | null = activeMediaListDisplayItemIdByZone[zoneId];
  return activeMediaListDisplayItem;
}
