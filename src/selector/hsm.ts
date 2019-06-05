import { isString, isObject } from "lodash";
import { BsBrightSignPlayerState } from "../index";

// ------------------------------------
// Selectors
// ------------------------------------
export function getActiveMediaStateId(state: BsBrightSignPlayerState, zoneId: string) {
  for (const hsm of state.bsplayer.hsms) {
    if (isString(hsm.hsm.zoneId) && hsm.hsm.zoneId === zoneId) {
      if (isObject(hsm.hsm.activeState) && isObject(hsm.hsm.activeState.mediaState)) {
        return hsm.hsm.activeState.mediaState.id;
      }
    }
  }
  return null;
}