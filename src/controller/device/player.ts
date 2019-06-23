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
    const event: ArEventType = {
      EventType: EventType.MediaEnd,
    };
    dispatch(dispatchHsmEvent(event));
  };
};

/** @internal */
/** @private */
export const processKeyPress = (key: any): any => {
  return (dispatch: any, getState: () => any) => {
    console.log('processKeyEvent');
    const event: ArEventType = {
      EventType: EventType.Keyboard,
      EventData: {
        key
      },
    };
    const action: any = dispatchHsmEvent(event);
    dispatch(action);
  };
};
