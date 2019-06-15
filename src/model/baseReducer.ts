/** @module Model:base */

import {
  Reducer,
  combineReducers
} from 'redux';
import { BsBrightSignPlayerModelState } from '../type';
import { activeHStateReducer, isValidActiveHStates } from './activeHState';
import { BsBrightSignPlayerModelBaseAction, BsBrightSignPlayerModelBatchAction, BSBSBRIGHTSIGNPLAYERMODEL_BATCH } from '.';
import { hsmReducer, isValidHSMs } from './hsm';
import { isObject } from 'lodash';
import { userVariableReducer, isValidUserVariableState } from './userVariable';

// -----------------------------------------------------------------------
// Defaults
// -----------------------------------------------------------------------

// none

// -----------------------------------------------------------------------
// Reducers
// -----------------------------------------------------------------------
export type BsBrightSignPlayerReducer = Reducer<BsBrightSignPlayerModelState>;
const enableBatching = (
  reduce: (state: BsBrightSignPlayerModelState, action: BsBrightSignPlayerModelBaseAction | BsBrightSignPlayerModelBatchAction) => BsBrightSignPlayerModelState,
): BsBrightSignPlayerReducer => {
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

export const bsBrightSignPlayerReducer: BsBrightSignPlayerReducer = enableBatching(combineReducers<BsBrightSignPlayerModelState>({
  activeHStates: activeHStateReducer,
  hsms: hsmReducer,
  userVariables: userVariableReducer,
}));

// -----------------------------------------------------------------------
// Validators
// -----------------------------------------------------------------------

export const isValidBsBrightSignPlayerModelState = (state: any): boolean => {
  return isObject(state)
    && state.hasOwnProperty('activeHStates') && isValidActiveHStates(state.activeHStates)
    && state.hasOwnProperty('hsms') && isValidHSMs(state.hsms)
    && state.hasOwnProperty('userVariables') && isValidUserVariableState(state.userVariables);
};

export const isValidBsBrightSignPlayerModelStateShallow = (state: any): boolean => {
  return isObject(state)
  && state.hasOwnProperty('activeHStates') 
  && state.hasOwnProperty('hsms')
  && state.hasOwnProperty('userVariables');
};
