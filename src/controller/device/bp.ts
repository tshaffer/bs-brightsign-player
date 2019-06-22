import { DmBpOutputCommandData } from '@brightsign/bsdatamodel';
import { BpAction, EventType } from '@brightsign/bscore';
import { isObject } from 'lodash';
import { ArEventType } from '../../type/runtime';
import { getReduxStore, dispatchHsmEvent } from '../runtime';

let bp900Setup: BSControlPort;
let bp900: BSControlPort;

export function initializeButtonPanels() {

  try {
    bp900Setup = new BSControlPort('TouchBoard-0-LED-SETUP') as any;
    bp900Setup.SetPinValue(0, 11);

    bp900 = new BSControlPort('TouchBoard-0-LED') as any;

    console.log('setup oncontrol down handler');

    const getBP900ControlPort0Promise: Promise<any> = getControlPort('TouchBoard-0-GPIO');

    getBP900ControlPort0Promise
      .then((controlPort) => {
        console.log('bp900ControlPort created');
  
        controlPort.oncontroldown = (e: any) => {
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
      })
      .catch((err) => {
        console.log(err);
      });
  
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

function getControlPort(portName: string): any {
  return new Promise((resolve: any) => {
    let controlPort: any = null;
    try {
      controlPort = new BSControlPort(portName);
    }
    catch (e) {
      console.log('failed to create controlPort: ');
      console.log(portName);
    }
    resolve(controlPort);
  });
}

