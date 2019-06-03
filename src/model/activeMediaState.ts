import { ActiveMediaStatesShape } from '../type/activeMediaState';
import { ActionWithPayload } from './baseAction';

// ------------------------------------
// Constants
// ------------------------------------
export const SET_ACTIVE_MEDIA_STATE = 'SET_ACTIVE_MEDIA_STATE';

// ------------------------------------
// Actions
// ------------------------------------
export function setActiveMediaState(zoneId: string, mediaStateId: string) {

  return {
    type: SET_ACTIVE_MEDIA_STATE,
    payload: {
      zoneId,
      mediaStateId,
    },
  };
}

// ------------------------------------
// Reducer
// ------------------------------------
const initialState: ActiveMediaStatesShape = {
  activeMediaStateIdByZone: {},
};

export const activeMediaStateReducer = (
  state: ActiveMediaStatesShape = initialState,
  action: ActionWithPayload) => {
  switch (action.type) {

    case SET_ACTIVE_MEDIA_STATE: {

      const newState: ActiveMediaStatesShape = Object.assign({}, state);

      const { zoneId, mediaStateId } = action.payload;
      newState.activeMediaStateIdByZone[zoneId] = mediaStateId;

      console.log(newState);

      return newState;
    }
    default:
      return state;
  }
};
