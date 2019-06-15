import { UserVariableMap } from '../type/userVariable';
import { ActionWithPayload } from './baseAction';
import { isObject } from 'lodash';
import { DmParameterizedString } from '@brightsign/bsdatamodel';

// ------------------------------------
// Constants
// ------------------------------------
export const ADD_USER_VARIABLE = 'ADD_USER_VARIABLE';

// ------------------------------------
// Actions
// ------------------------------------
export function addUserVariable(userVariableId: string, currentValue: DmParameterizedString) {
  
  return {
    type: ADD_USER_VARIABLE,
    payload: {
      userVariableId,
      currentValue,
    },
  };
}

// ------------------------------------
// Reducer
// ------------------------------------

const initialState: UserVariableMap = {};

export const userVariableReducer = (
  state: UserVariableMap = initialState,
  action: ActionWithPayload) => {
  switch (action.type) {

    case ADD_USER_VARIABLE: {

      const newState: UserVariableMap = Object.assign({}, state);

      const { userVariableId, currentValue } = action.payload;

      newState[userVariableId] = currentValue;
      
      console.log(newState);

      return newState;
    }
    default:
      return state;
  }
};

/** @internal */
/** @private */
export const isValidUserVariableState = (state: any): boolean => {
  return isObject(state);
  //  && state.hasOwnProperty('userVariableId') && isObject(state.userVariableId);
};


