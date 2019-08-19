import { ArDataFeedMap, ArDataFeed } from '../type/dataFeed';
import { ActionWithPayload } from './baseAction';
import { isObject } from 'lodash';

// ------------------------------------
// Constants
// ------------------------------------
export const ADD_DATA_FEED = 'ADD_DATA_FEED';

// ------------------------------------
// Actions
// ------------------------------------
export function addDataFeed(dataFeedId: string, dataFeed: ArDataFeed) {
  
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

const initialState: ArDataFeedMap = {};

export const dataFeedReducer = (
  state: ArDataFeedMap = initialState,
  action: ActionWithPayload) => {
  switch (action.type) {
    case ADD_DATA_FEED: {
      const newState: ArDataFeedMap = Object.assign({}, state);
      const { dataFeedId, dataFeed } = action.payload;
      newState[dataFeedId] = dataFeed;
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


