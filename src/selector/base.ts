import { BsBrightSignPlayerModelState, isValidBsBrightSignPlayerModelStateShallow } from "../index";
import { BsBrightSignPlayerError, BsBrightSignPlayerErrorType } from "../utility/BsBrightSignPlayerError";

/** @module Selector:base */

/** @internal */
/** @private */
export const bsBrightSignPlayerModelFilterBaseState = (state: any): BsBrightSignPlayerModelState => {
  if (state.hasOwnProperty('bsautotronmodel') && isValidBsBrightSignPlayerModelStateShallow(state.bsautotronmodel)) {
    return state.bsautotronmodel as BsBrightSignPlayerModelState;
  } else if (isValidBsBrightSignPlayerModelStateShallow(state)) {
    return state as BsBrightSignPlayerModelState;
  } else {
    const exceptionMessage = `state must be of type BsBrightSignPlayerModelState or have a field bsautotronmodel
      of type BsBrightSignPlayerModelState. invalid state ${JSON.stringify(state)}`;
    throw new BsBrightSignPlayerError(BsBrightSignPlayerErrorType.invalidParameters, exceptionMessage);
  }
};

/** @internal */
/** @private */
export const bsBrightSignPlayerModelGetBaseState = (state: BsBrightSignPlayerModelState): BsBrightSignPlayerModelState  => {
  return bsBrightSignPlayerModelFilterBaseState(state);
};
