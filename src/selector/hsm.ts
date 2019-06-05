import { BsAutotronState } from "../../index";
import { isString, isObject } from "lodash";

// ------------------------------------
// Selectors
// ------------------------------------
export function getActiveMediaStateId(state: BsAutotronState, zoneId: string) {
  for (const hsm of state.bsAutotron.hsms) {
    if (isString(hsm.hsm.zoneId) && hsm.hsm.zoneId === zoneId) {
      if (isObject(hsm.hsm.activeState) && isObject(hsm.hsm.activeState.mediaState)) {
        return hsm.hsm.activeState.mediaState.id;
      }
    }
  }
  return null;
}