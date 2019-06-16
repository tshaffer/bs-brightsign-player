import { HStateMap } from '../type/activeHState';
import { ActionWithPayload } from './baseAction';
import { isObject } from 'lodash';

// ------------------------------------
// Constants
// ------------------------------------
export const SET_ACTIVE_HSTATE = 'SET_ACTIVE_HSTATE';

// ------------------------------------
// Actions
// ------------------------------------
export function setActiveHState(hsmId: string, activeState: any) {
  return {
    type: SET_ACTIVE_HSTATE,
    payload: {
      hsmId,
      activeState,
    },
  };
}

// ------------------------------------
// Reducer
// ------------------------------------

const initialState: HStateMap = {};

export const activeHStateReducer = (
  state: HStateMap = initialState,
  action: ActionWithPayload) => {
  switch (action.type) {

    case SET_ACTIVE_HSTATE: {
      const newState: HStateMap = Object.assign({}, state);
      const { hsmId, activeState } = action.payload;
      newState[hsmId] = activeState;
      return newState;
    }
    default:
      return state;
  }
};

/** @internal */
/** @private */
export const isValidActiveHStates = (state: any): boolean => {
  return isObject(state);
  // TEDTODO
  //  && state.hasOwnProperty('statePositionById') && isObject(state.statePositionById);
};
