/** @module Selector:base */

import { BsBrightSignPlayerModelState } from '../type';
import { isValidBsBrightSignPlayerModelStateShallow } from '../index';
import { 
  BsBrightSignPlayerError, 
  BsBrightSignPlayerErrorType 
} from '../utility/BsBrightSignPlayerError';

/** @internal */
/** @private */
export const bsBrightSignPlayerModelFilterBaseState = (state: any): BsBrightSignPlayerModelState => {
  if (state.hasOwnProperty('bsbrightsignplayermodel') && isValidBsBrightSignPlayerModelStateShallow(state.bsbrightsignplayermodel)) {
    return state.bsbrightsignplayermodel as BsBrightSignPlayerModelState;
  } else if (isValidBsBrightSignPlayerModelStateShallow(state)) {
    return state as BsBrightSignPlayerModelState;
  } else {
    const exceptionMessage = `state must be of type BsBrightSignPlayerModelState or have a field bsbrightsignplayermodel
      of type BsBrightSignPlayerModelState. invalid state ${JSON.stringify(state)}`;
    throw new BsBrightSignPlayerError(BsBrightSignPlayerErrorType.invalidParameters, exceptionMessage);
  }
};

/** @internal */
/** @private */
export const bsBrightSignPlayerModelGetBaseState = (state: BsBrightSignPlayerModelState): BsBrightSignPlayerModelState  => {
  return bsBrightSignPlayerModelFilterBaseState(state);
};
