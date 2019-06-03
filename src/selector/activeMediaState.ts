import { BsBrightSignPlayerState } from "../index";


// ------------------------------------
// Selectors
// ------------------------------------
export function getActiveMediaStateId(state: BsBrightSignPlayerState, zoneId: string) {
  const activeMediaStateIdByZone = state.bsplayer.activeMediaStates.activeMediaStateIdByZone;
  return activeMediaStateIdByZone[zoneId];
}
