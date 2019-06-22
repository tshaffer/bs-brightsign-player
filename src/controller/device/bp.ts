import { DmBpOutputCommandData } from '@brightsign/bsdatamodel';
import { BpAction, EventType } from '@brightsign/bscore';
import { isObject } from 'lodash';
import { ArEventType } from '../../type/runtime';
import { getReduxStore, dispatchHsmEvent } from '../runtime';

let bp900Control: BSControlPort;
let bp900Leds: BSControlPort;
let bp900LedsSetup: BSControlPort;

export function initializeButtonPanels() {

  try {
    bp900Control = new BSControlPort('TouchBoard-0-GPIO') as any;

    bp900LedsSetup = new BSControlPort('TouchBoard-0-LED-SETUP') as any;
    bp900LedsSetup.SetPinValue(0, 11);

    bp900Leds = new BSControlPort('TouchBoard-0-LED') as any;

    bp900Control.oncontroldown = (e: any) => {
      console.log('### oncontroldown ' + e.code);
      const newtext = ' DOWN: ' + e.code + '\n';
      console.log(newtext);

      const event: ArEventType = {
        EventType: EventType.Bp,
        EventData: {
          bpIndex: 'a',
          bpType: 'bp900',
          buttonNumber: Number(e.code),
        }
      };

      console.log('********------- dispatch bp event');
  
      const reduxStore: any = getReduxStore();
      reduxStore.dispatch(dispatchHsmEvent(event));
    };  
  }
  catch (e) {
    console.log('failed to create controlPort: ');
  }
}

function getPinValue(bpAction: BpAction): number {
  switch (bpAction) {
    case BpAction.On:
      return 1;
    case BpAction.Off:
      return 0;
    case BpAction.FastBlink:
      return 0x038e38c;
    case BpAction.MediumBlink:
      return 0x03f03e0;
    case BpAction.SlowBlink:
      return 0x03ff800;
    default:
      return 0;
  }
}

export function setBpOutput(bpCommandData: DmBpOutputCommandData) {

  if (!isObject(bp900Leds)) {
    return;
  }

  // const bpType: BpType = bpCommandData.bpType;
  // const bpIndex: BpIndex = bpCommandData.bpIndex;
  const buttonNumber: number = bpCommandData.buttonNumber;
  const bpAction: BpAction = bpCommandData.bpAction;

  const pinValue: number = getPinValue(bpAction);

  console.log('setBpOutput');
  console.log(buttonNumber);
  console.log(bpAction);
  console.log(pinValue);

  if (buttonNumber === -1) {
    for (let index = 0; index < 11; index++) {
      bp900Leds.SetPinValue(index, pinValue);
    }
  }
}
