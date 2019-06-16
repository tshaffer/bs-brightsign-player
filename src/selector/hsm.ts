import { isObject } from 'lodash';
import { BsBrightSignPlayerState } from '../index';
import { MediaHState } from '../controller/hsm/mediaHState';
import { BsDmId } from '@brightsign/bsdatamodel';
import { DmMediaState } from '@brightsign/bsdatamodel';
import { ZoneHSM } from '../controller/hsm/zoneHSM';

// ------------------------------------
// Selectors
// ------------------------------------
export function getActiveMediaStateId(state: BsBrightSignPlayerState, zoneId: string): BsDmId | null {
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