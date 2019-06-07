/** @module Types:base */

import { DmState } from '@brightsign/bsdatamodel';
import { ZoneHSM } from '../runtime/hsm/zoneHSM';
import { HStateMap } from './activeHState';

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
  activeHStates: HStateMap;
}
