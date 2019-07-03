import { DataFeedMap, DataFeed } from '../type/dataFeed';
import { ActionWithPayload } from './baseAction';
import { isObject } from 'lodash';

// ------------------------------------
// Constants
// ------------------------------------
export const ADD_DATA_FEED = 'ADD_DATA_FEED';

// ------------------------------------
// Actions
// ------------------------------------
export function addDataFeed(dataFeedId: string, dataFeed: DataFeed) {
  
  return {
    type: ADD_DATA_FEED,
    payload: {
      dataFeedId,
      dataFeed,
    },
  };
}

// ------------------------------------
// Reducer
// ------------------------------------

const initialState: DataFeedMap = {};

export const dataFeedReducer = (
  state: DataFeedMap = initialState,
  action: ActionWithPayload) => {
  switch (action.type) {
    case ADD_DATA_FEED: {
      const newState: DataFeedMap = Object.assign({}, state);
      const { dataFeedId, currentValue } = action.payload;
      newState[dataFeedId] = currentValue;
      return newState;
    }
    default:
      return state;
  }
};

/** @internal */
/** @private */
export const isValidDataFeedState = (state: any): boolean => {
  return isObject(state);
  //  && state.hasOwnProperty('dataFeedId') && isObject(state.dataFeedId);
};


