import { isObject } from 'lodash';
import { BsBrightSignPlayerState } from '../index';
import { MediaHState } from '../runtime/hsm/mediaHState';
import { DmMediaState } from '@brightsign/bsdatamodel';
import { ZoneHSM } from '../runtime/hsm/zoneHSM';

// ------------------------------------
// Selectors
// ------------------------------------
export function getActiveMediaStateId(state: BsBrightSignPlayerState, zoneId: string) {
  for (const hsm of state.bsPlayer.hsms) {
    if (hsm.hasOwnProperty('zoneId')) {
      const zoneHsm: ZoneHSM = hsm as ZoneHSM;
      if (zoneHsm.id === zoneId) {
        if (isObject(hsm.activeState)) {
          const activeMediaHState: MediaHState = hsm.activeState as MediaHState;
          const mediaState: DmMediaState = activeMediaHState.mediaState;
          return mediaState.id;
        }
      }
    }
  }
  return null;
}