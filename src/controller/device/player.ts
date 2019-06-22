import { ArEventType } from '../../type/runtime';
import { EventType } from '@brightsign/bscore';
import { dispatchHsmEvent } from '../runtime';

// -----------------------------------------------------------------------
// Controller Methods
// -----------------------------------------------------------------------

/** @internal */
/** @private */
export const postVideoEnd = (): any => {
  return (dispatch: any, getState: () => any) => {
    console.log('postMediaEndEvent');
    const event : ArEventType = {
      EventType : EventType.MediaEnd,
    };
    dispatch(dispatchHsmEvent(event));
  };
};
