import { BsBrightSignPlayerState } from '../type';

// ------------------------------------
// Selectors
// ------------------------------------
export function getActiveHStateId(state: BsBrightSignPlayerState, hsmId: string) {
  const activeHStateIdByZone = state.bsplayer.activeHStates.activeHStateIdByHSM;
  return activeHStateIdByZone[hsmId];
}
