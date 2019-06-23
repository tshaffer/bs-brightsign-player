import { MediaHState } from './mediaHState';
import { ZoneHSM } from './zoneHSM';
import { DmMediaState } from '@brightsign/bsdatamodel';
import { ArEventType, HSMStateData } from '../../type/runtime';

export default class SuperState extends MediaHState {
  
  constructor(zoneHSM: ZoneHSM, mediaState: DmMediaState) {

    super(zoneHSM, mediaState.id);
    this.mediaState = mediaState;

    this.superState = zoneHSM.stTop;

    this.HStateEventHandler = this.STDisplayingSuperStateEventHandler;
  }

  STDisplayingSuperStateEventHandler(event: ArEventType, stateData: HSMStateData): any {

    return (dispatch: any) => {
      stateData.nextState = this.superState;
      return 'SUPER';
    };
  }
}
