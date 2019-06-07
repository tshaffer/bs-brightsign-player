import { BsBrightSignPlayerState } from '../type';

// ------------------------------------
// Selectors
// ------------------------------------
// TEDTODO - create selector?
export function getActiveHStateId(state: BsBrightSignPlayerState, hsmId: string): string | null {
  const activeHStateIdByZone = state.bsPlayer.activeHStates;
  return activeHStateIdByZone[hsmId];
}
