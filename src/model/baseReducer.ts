/** @module Model:base */

import {
  Reducer,
  combineReducers
} from 'redux';
import { BsBrightSignPlayerModelState } from '../type';
import { activeHStateReducer } from './activeHState';
import { BsBrightSignPlayerModelBaseAction, BsBrightSignPlayerModelBatchAction, BSBSBRIGHTSIGNPLAYERMODEL_BATCH } from '.';
import { hsmReducer } from './hsm';

// -----------------------------------------------------------------------
// Defaults
// -----------------------------------------------------------------------

// none

// -----------------------------------------------------------------------
// Reducers
// -----------------------------------------------------------------------
export type BsBspReducer = Reducer<BsBrightSignPlayerModelState>;
const enableBatching = (
  reduce: (state: BsBrightSignPlayerModelState, action: BsBrightSignPlayerModelBaseAction | BsBrightSignPlayerModelBatchAction) => BsBrightSignPlayerModelState,
): BsBspReducer => {
  return function batchingReducer(
    state: BsBrightSignPlayerModelState,
    action: BsBrightSignPlayerModelBaseAction | BsBrightSignPlayerModelBatchAction,
  ): BsBrightSignPlayerModelState {
    switch (action.type) {
      case BSBSBRIGHTSIGNPLAYERMODEL_BATCH:
        return (action as BsBrightSignPlayerModelBatchAction).payload.reduce(batchingReducer, state);
      default:
        return reduce(state, action);
    }
  };
};

export const bsBspReducer: BsBspReducer = enableBatching(combineReducers<BsBrightSignPlayerModelState>({
  activeHStates: activeHStateReducer,
  hsms: hsmReducer,
}));

// -----------------------------------------------------------------------
// Validators
// -----------------------------------------------------------------------

export const isValidBsBrightSignPlayerModelState = (state: any): boolean => {
  return true;
};

export const isValidBsBrightSignPlayerModelStateShallow = (state: any): boolean => {
  return true;
};
