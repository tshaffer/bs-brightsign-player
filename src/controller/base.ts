import {
  BsBrightSignPlayerModelState
} from '../type';
import {
  BsBrightSignPlayerModelAction,
  BsBrightSignPlayerModelThunkAction,
  BsBrightSignPlayerModelDispatch,
  bsBrightSignPlayerModelRehydrateModel,
  bsBrightSignPlayerModelResetModel,
} from '../model';

// -----------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------

const fetchModelAsync = (): Promise<BsBrightSignPlayerModelState> => {
  return new Promise((resolve) => {
    const model: BsBrightSignPlayerModelState = {
      activeHStates: {},
      activeMrssDisplayItems: {},
      hsms: [],
      dataFeeds: {},
      userVariables: {},
    };
    resolve(model);
  });
};

// -----------------------------------------------------------------------
// Controller Methods
// -----------------------------------------------------------------------

export const initModel = (): BsBrightSignPlayerModelThunkAction<Promise<any>> => {
  return (dispatch: BsBrightSignPlayerModelDispatch, getState: () => BsBrightSignPlayerModelState) => {
    return fetchModelAsync()
      .then((model: BsBrightSignPlayerModelState) => dispatch(bsBrightSignPlayerModelRehydrateModel(model)));
  };
};

export const resetModel = (): BsBrightSignPlayerModelThunkAction<BsBrightSignPlayerModelAction<null>> => {
  return (dispatch: BsBrightSignPlayerModelDispatch, getState: () => BsBrightSignPlayerModelState) => {
    return dispatch(bsBrightSignPlayerModelResetModel());
  };
};
