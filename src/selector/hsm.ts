import { isString, isObject } from 'lodash';
import { BsBrightSignPlayerState } from '../index';
// import { HState } from '../runtime/hsm/HSM';
import { MediaHState } from '../runtime/hsm/mediaHState';
import { DmMediaState } from '@brightsign/bsdatamodel';

// ------------------------------------
// Selectors
// ------------------------------------
export function getActiveMediaStateId(state: BsBrightSignPlayerState, zoneId: string) {
  for (const hsm of state.bsPlayer.hsms) {
    if (isString(hsm.zoneId) && hsm.zoneId === zoneId) {
      if (isObject(hsm.activeState)) {
        const activeMediaHState: MediaHState = hsm.activeState as MediaHState;
        const mediaState: DmMediaState = activeMediaHState.mediaState;
        return mediaState.id;
      }
    }
  }
  return null;
}