import { ActionWithPayload } from './baseAction';
import { isObject } from 'lodash';
import { MrssDisplayItemMap } from '../type/activeMrssDisplayItem';
import { DataFeedItem } from '../type/dataFeed';

// ------------------------------------
// Constants
// ------------------------------------
export const SET_ACTIVE_MRSS_DISPLAY_ITEM = 'SET_ACTIVE_MRSS_DISPLAY_ITEM';

// ------------------------------------
// Actions
// ------------------------------------
export function setActiveMrssDisplayItem(hsmId: string, activeMrssDisplayItem: DataFeedItem): ActionWithPayload {
  return {
    type: SET_ACTIVE_MRSS_DISPLAY_ITEM,
    payload: {
      hsmId,
      activeMrssDisplayItem,
    },
  };
}

// ------------------------------------
// Reducer
// ------------------------------------

const initialState: MrssDisplayItemMap = {};

export const activeMrssDisplayItemReducer = (
  state: MrssDisplayItemMap = initialState,
  action: ActionWithPayload) => {
  switch (action.type) {

    case SET_ACTIVE_MRSS_DISPLAY_ITEM: {
      const newState: MrssDisplayItemMap = Object.assign({}, state);
      const { hsmId, activeMrssDisplayItem } = action.payload;
      newState[hsmId] = activeMrssDisplayItem;
      return newState;
    }
    default:
      return state;
  }
};

/** @internal */
/** @private */
export const isValidActiveMrssDisplayItems = (state: any): boolean => {
  return isObject(state);
  // TEDTODO
  //  && state.hasOwnProperty('statePositionById') && isObject(state.statePositionById);
};
