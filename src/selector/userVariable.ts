import { BsBrightSignPlayerState } from '../type';
import { UserVariable } from '../type/userVariable';

// ------------------------------------
// Selectors
// ------------------------------------
// TEDTODO - create selector?
export function getUserVariableById(state: BsBrightSignPlayerState, userVariableId: string): UserVariable | null {
  const userVariblesById = state.bsPlayer.userVariables;
  return userVariblesById[userVariableId];
}
