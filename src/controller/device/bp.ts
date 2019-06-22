import { DmBpOutputCommandData } from '@brightsign/bsdatamodel';
import { BpAction } from '@brightsign/bscore';
import { isObject } from 'lodash';

let bp900Setup: BSControlPort;
let bp900: BSControlPort;

export function initializeButtonPanels() {
  
  try {
    bp900Setup = new BSControlPort('TouchBoard-0-LED-SETUP') as any;
    bp900Setup.SetPinValue(0, 11);

    bp900 = new BSControlPort('TouchBoard-0-LED') as any;
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

  if (!isObject(bp900)) {
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
      bp900.SetPinValue(index, pinValue);
    }
  }
}


