/** @module Types:base */

import { DmState } from '@brightsign/bsdatamodel';
import { ActiveMediaStatesShape } from './activeMediaState';

/** @internal */
/** @private */
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export interface BsBrightSignPlayerState {
  bsdm: DmState;
  bsplayer: BsBrightSignPlayerModelState;
}

/** @internal */
/** @private */
export interface BsBrightSignPlayerModelState {
  activeMediaStates: ActiveMediaStatesShape;
}
