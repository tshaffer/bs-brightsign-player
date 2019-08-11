/** @module Model:base */

import { Action } from 'redux';
import { ActionCreator } from 'redux';
import { Dispatch } from 'redux';
import { BsBrightSignPlayerModelState } from '../type';

/** @internal */
/** @private */
export interface ActionWithPayload extends Action {
  payload : any;
}

// -----------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------

/** @internal */
/** @private */
export const BSBSBRIGHTSIGNPLAYERMODEL_BATCH = 'BSBSBRIGHTSIGNPLAYERMODEL_BATCH';

/** @internal */
/** @private */
export const BSBSBRIGHTSIGNPLAYERMODEL_REHYDRATE = 'BSBSBRIGHTSIGNPLAYERMODEL_REHYDRATE';

/** @internal */
/** @private */
export const BSBSBRIGHTSIGNPLAYERMODEL_RESET = 'BSBSBRIGHTSIGNPLAYERMODEL_RESET';

/** @internal */
/** @private */
export type BsBrightSignPlayerModelDispatch = Dispatch<BsBrightSignPlayerModelState>;

/** @internal */
/** @private */
export interface BsBrightSignPlayerModelBaseAction extends Action {
  type: string;   // override Any - must be a string
  payload: {};
  error?: boolean;
  meta?: {};
}

/** @internal */
/** @private */
export interface BsBrightSignPlayerModelAction<T> extends BsBrightSignPlayerModelBaseAction {
  payload: T;     // override payload with specific parameter type
}

/** @internal */
/** @private */
export type BsBrightSignPlayerModelActionCreator<T> = ActionCreator<BsBrightSignPlayerModelAction<T>>;

/** @internal */
/** @private */
export type BsBrightSignPlayerModelThunkAction<T> = (
  dispatch: BsBrightSignPlayerModelDispatch,
  getState: () => BsBrightSignPlayerModelState,
  extraArgument: undefined,
) => T;

/** @internal */
/** @private */
export const bsBrightSignPlayerModelBatchAction = (action: BsBrightSignPlayerModelBaseAction[]): BsBrightSignPlayerModelBatchAction => {
  return {type: BSBSBRIGHTSIGNPLAYERMODEL_BATCH, payload: action};
};

/** @internal */
/** @private */
export interface BsBrightSignPlayerModelBatchAction extends Action {
  type: string;
  payload: BsBrightSignPlayerModelBaseAction[];
}

/** @internal */
/** @private */
export interface RehydrateBsBrightSignPlayerModelParams {
  newBsBrightSignPlayerModelState: BsBrightSignPlayerModelState;
}

/** @internal */
/** @private */
export type RehydrateBsBrightSignPlayerModelAction = BsBrightSignPlayerModelAction<RehydrateBsBrightSignPlayerModelParams>;
export const bsBrightSignPlayerModelRehydrateModel = (bsBrightSignPlayerModelState: BsBrightSignPlayerModelState): RehydrateBsBrightSignPlayerModelAction => {
  return {
    type: BSBSBRIGHTSIGNPLAYERMODEL_REHYDRATE,
    payload: {
      newBsBrightSignPlayerModelState: bsBrightSignPlayerModelState,
    },
  };
};

/** @internal */
/** @private */
export type ResetBsBrightSignPlayerModelAction = BsBrightSignPlayerModelAction<null>;
export const bsBrightSignPlayerModelResetModel = (): ResetBsBrightSignPlayerModelAction => {
  return {
    type: BSBSBRIGHTSIGNPLAYERMODEL_RESET,
    payload: null,
  };
};
