import { HSMsShape } from "../type/hsm";
import { ActionWithPayload } from "./baseAction";

// ------------------------------------
// Constants
// ------------------------------------
export const ADD_HSM = 'ADD_HSM';

// ------------------------------------
// Actions
// ------------------------------------
export function addHSM(hsm: any) {

  console.log('addHSM:');
  console.log(hsm);

  return {
    type: ADD_HSM,
    payload: hsm,
  };
}

// ------------------------------------
// Reducer
// ------------------------------------
const initialState: HSMsShape = [];

export const hsmReducer = (
  state: HSMsShape = initialState,
  action: ActionWithPayload) => {
  switch (action.type) {

    case ADD_HSM: {

      const newState: HSMsShape = state.slice(0);
      newState.push(action.payload);

      return newState;
    }
    default:
      return state;
  }
};



