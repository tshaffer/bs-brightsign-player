import { DmBpOutputCommandData } from '@brightsign/bsdatamodel';
import { BpAction } from '@brightsign/bscore';

declare class BSControlPort {
  SetPinValue: any;
  constructor(portName: string);
}

let bp900Setup: any;
let bp900: BSControlPort;

export function initializeBrightSign() {
  bp900Setup = new BSControlPort('TouchBoard-0-LED-SETUP') as any;
  bp900Setup.SetPinValue(0, 11);

  bp900 = new BSControlPort('TouchBoard-0-LED') as any;

  // bp900.SetPinValue(0, 0x038e38c);
  // bp900.SetPinValue(1, 0x038e38c);
  // bp900.SetPinValue(2, 0x038e38c);
  // bp900.SetPinValue(3, 0x038e38c);
  // bp900.SetPinValue(4, 0x038e38c);
  // bp900.SetPinValue(5, 0x038e38c);
  // bp900.SetPinValue(6, 0x038e38c);
  // bp900.SetPinValue(7, 0x038e38c);
  // bp900.SetPinValue(8, 0x038e38c);
  // bp900.SetPinValue(9, 0x038e38c);
  // bp900.SetPinValue(10, 0x038e38c);
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
/*
					if action$ = 'on' then
						m.bpOutput[buttonPanelIndex%].SetOutputState(i%, 1)
					else if action$ = 'off' then
						m.bpOutput[buttonPanelIndex%].SetOutputState(i%, 0)
					else if action$ = 'fastBlink' then
						m.bpOutput[buttonPanelIndex%].SetOutputValue(i%, &h038e38c)
					else if action$ = 'mediumBlink' then
						m.bpOutput[buttonPanelIndex%].SetOutputValue(i%, &h03f03e0)
					else if action$ = 'slowBlink' then
						m.bpOutput[buttonPanelIndex%].SetOutputValue(i%, &h03ff800)
					endif
*/