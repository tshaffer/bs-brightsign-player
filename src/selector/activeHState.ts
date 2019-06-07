import { BsBrightSignPlayerState } from '../type';

// ------------------------------------
// Selectors
// ------------------------------------
export function getActiveHStateId(state: BsBrightSignPlayerState, hsmId: string) {
  const activeHStateIdByZone = state.bsPlayer.activeHStates;
  return activeHStateIdByZone[hsmId];
}
