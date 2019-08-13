import { ActionWithPayload } from './baseAction';
import { isObject } from 'lodash';
import { MediaListDisplayItemMap } from '../type/activeMediaListDisplayItem';
import { DataFeedItem } from '../type/dataFeed';
import { DmMediaContentItem } from '@brightsign/bsdatamodel';

// ------------------------------------
// Constants
// ------------------------------------
export const SET_ACTIVE_MEDIALIST_DISPLAY_ITEM = 'SET_ACTIVE_MEDIALIST_DISPLAY_ITEM';

// ------------------------------------
// Actions
// ------------------------------------
export function setActiveMediaListDisplayItem(zoneId: string, activeMediaListDisplayItem: DmMediaContentItem): ActionWithPayload {
  return {
    type: SET_ACTIVE_MEDIALIST_DISPLAY_ITEM,
    payload: {
      zoneId,
      activeMediaListDisplayItem,
    },
  };
}

// ------------------------------------
// Reducer
// ------------------------------------

const initialState: MediaListDisplayItemMap = {};

export const activeMediaListDisplayItemReducer = (
  state: MediaListDisplayItemMap = initialState,
  action: ActionWithPayload) => {
  switch (action.type) {

    case SET_ACTIVE_MEDIALIST_DISPLAY_ITEM: {
      const newState: MediaListDisplayItemMap = Object.assign({}, state);
      const { zoneId, activeMediaListDisplayItem } = action.payload;
      newState[zoneId] = activeMediaListDisplayItem;
      return newState;
    }
    default:
      return state;
  }
};

/** @internal */
/** @private */
export const isValidActiveMediaListDisplayItems = (state: any): boolean => {
  return isObject(state);
  // TEDTODO
  //  && state.hasOwnProperty('statePositionById') && isObject(state.statePositionById);
};
