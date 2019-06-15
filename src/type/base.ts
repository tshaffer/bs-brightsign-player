/** @module Types:base */

import { DmState } from '@brightsign/bsdatamodel';
import { HStateMap } from './activeHState';
import { HSM } from '../runtime/hsm/HSM';
import { UserVariableMap } from './userVariable';

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
  hsms: HSM[];
  activeHStates: HStateMap;
  userVariables: UserVariableMap;
}
