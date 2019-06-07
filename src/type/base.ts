/** @module Types:base */

import { DmState } from '@brightsign/bsdatamodel';
// import { HSM } from '../runtime/hsm/HSM';
import { ZoneHSM } from '../runtime/hsm/zoneHSM';
import { ActiveHStatesByHsm } from './activeHState';

/** @internal */
/** @private */
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export interface BsBrightSignPlayerState {
  bsdm: DmState;
  bsPlayer: BsBrightSignPlayerModelState;
}

/** @internal */
/** @private */
export interface BsBrightSignPlayerModelState {
  hsms: ZoneHSM[];
  // activeHStates: ActiveHStatesByHsm;
  // hsms: any[];
  activeHStates: ActiveHStatesByHsm;
}
