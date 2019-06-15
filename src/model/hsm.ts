import { HSMList } from '../type/hsm';
import { ActionWithPayload } from './baseAction';
import { HSM } from '../runtime/hsm/HSM';
import { isObject } from 'lodash';

// ------------------------------------
// Constants
// ------------------------------------
export const ADD_HSM = 'ADD_HSM';

// ------------------------------------
// Actions
// ------------------------------------
export function addHSM(hsm: HSM) {
  return {
    type: ADD_HSM,
    payload: hsm,
  };
}

// ------------------------------------
// Reducer
// ------------------------------------
const initialState: HSMList = [];

export const hsmReducer = (
  state: HSMList = initialState,
  action: ActionWithPayload) => {
  switch (action.type) {

    case ADD_HSM: {

      const newState: HSMList = state.slice(0);
      newState.push(action.payload);

      return newState;
    }
    default:
      return state;
  }
};

/** @internal */
/** @private */
export const isValidHSMs = (state: any): boolean => {
  return isObject(state);
  // TEDTODO
  //  && state.hasOwnProperty('statePositionById') && isObject(state.statePositionById);
};
