/** @module Types:base */

import { DmState } from '@brightsign/bsdatamodel';
import { HStateMap } from './activeHState';
import { HSM } from '../controller/hsm/HSM';
import { UserVariableMap } from './userVariable';
import { DataFeedMap } from './dataFeed';
import { MrssDisplayItemMap } from './activeMrssDisplayItem';

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
  activeMrssDisplayItems: MrssDisplayItemMap;
  userVariables: UserVariableMap;
  dataFeeds: DataFeedMap;
}
