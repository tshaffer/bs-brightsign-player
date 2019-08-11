/** @module Types:base */

import { DmState } from '@brightsign/bsdatamodel';
import { HStateMap } from './activeHState';
import { HSM } from '../controller/hsm/HSM';
import { UserVariableMap } from './userVariable';
import { DataFeedMap } from './dataFeed';
import { MrssDisplayItemMap } from './activeMrssDisplayItem';
import { Action, Dispatch } from 'redux';

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

export type BsBspDispatch = Dispatch<BsBrightSignPlayerModelState>;

export interface BsBspBaseAction extends Action {
  type: string;
  payload: {} | null;
  error?: boolean;
  meta?: {};
}

export type BsBspVoidThunkAction = (dispatch: BsBspDispatch, getState: () => BsBrightSignPlayerModelState, extraArgument: undefined) => void;
export type BsBspStringThunkAction = (dispatch: BsBspDispatch, getState: () => BsBrightSignPlayerModelState, extraArgument: undefined) => string;

export type BsBspThunkAction<T> = (dispatch: BsBspDispatch, getState: () => BsBrightSignPlayerModelState, extraArgument: undefined) => BsBspAction<T>;
// export type SimpleThunkAction<T> = (dispatch: BsBspDispatch) => BsBspAction<T>;

export interface BsBspAction<T> extends BsBspBaseAction {
  payload: T;
}

export type ExitHandlerAction = BsBspAction<void>;

