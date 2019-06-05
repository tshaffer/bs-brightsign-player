import { BsAutotronState } from "../../index";

// ------------------------------------
// Selectors
// ------------------------------------
export function getActiveHStateId(state: BsAutotronState, hsmId: string) {
  const activeHStateIdByZone = state.bsAutotron.activeHStates.activeHStateIdByHSM;
  return activeHStateIdByZone[hsmId];
}
