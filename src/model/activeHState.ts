import { HStateMap } from '../type/activeHState';
import { ActionWithPayload } from './baseAction';

// ------------------------------------
// Constants
// ------------------------------------
export const SET_ACTIVE_HSTATE = 'SET_ACTIVE_HSTATE';

// ------------------------------------
// Actions
// ------------------------------------
export function setActiveHState(hsmId: string, activeState: any) {

  console.log('setActiveHState:');
  console.log(hsmId);
  console.log(activeState);

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
      
      console.log(newState);

      return newState;
    }
    default:
      return state;
  }
};


