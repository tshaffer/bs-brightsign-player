import { BsBrightSignPlayerState } from '../type';
import { BsDmId } from '@brightsign/bsdatamodel';
import { DmMediaContentItem } from '@brightsign/bsdatamodel';
import { MediaListItem } from '../type/mediaListItem';

// ------------------------------------
// Selectors
// ------------------------------------
// TEDTODO - create selector?
export function getActiveMediaListDisplayItem(state: BsBrightSignPlayerState, zoneId: string): MediaListItem | null {
  const activeMediaListDisplayItemIdByZone = state.bsPlayer.activeMediaListDisplayItems;
  const activeMediaListDisplayItem: MediaListItem | null = activeMediaListDisplayItemIdByZone[zoneId];
  return activeMediaListDisplayItem;
}
