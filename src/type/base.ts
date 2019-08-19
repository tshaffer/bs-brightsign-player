/** @module Types:base */

import { DmState } from '@brightsign/bsdatamodel';
import { HStateMap } from './activeHState';
import { HSM } from '../controller/hsm/HSM';
import { UserVariableMap } from './userVariable';
import { ArDataFeedMap } from './dataFeed';
import { MrssDisplayItemMap } from './activeMrssDisplayItem';
import { MediaListDisplayItemMap } from './activeMediaListDisplayItem';
import { Dispatch } from 'redux';
import { Action } from 'redux';

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
  activeMediaListDisplayItems: MediaListDisplayItemMap;
  userVariables: UserVariableMap;
  arDataFeeds: ArDataFeedMap;
}

// BsBrightSignPlayerState: 
// Dispatch<BsBrightSignPlayerState> means: redux dispatch with a state of this shape (BsBrightSignPlayerState)
export type BsBspDispatch = Dispatch<BsBrightSignPlayerState>;

export interface BsBspBaseAction extends Action {
  type: string;
  payload: {} | null;
  error?: boolean;
  meta?: {};
}

export type BsBspVoidThunkAction = (dispatch: BsBspDispatch, getState: () => BsBrightSignPlayerState, extraArgument: undefined) => void;
export type BsBspStringThunkAction = (dispatch: BsBspDispatch, getState: () => BsBrightSignPlayerState, extraArgument: undefined) => string;

export type BsBspThunkAction<T> = (dispatch: BsBspDispatch, getState: () => BsBrightSignPlayerState, extraArgument: undefined) => BsBspAction<T>;
// export type SimpleThunkAction<T> = (dispatch: BsBspDispatch) => BsBspAction<T>;

export interface BsBspAction<T> extends BsBspBaseAction {
  payload: T;
}

export type ExitHandlerAction = BsBspAction<void>;
