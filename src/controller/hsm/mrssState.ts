import { MediaHState } from './mediaHState';
import { ZoneHSM } from './zoneHSM';
import { DmMediaState, BsDmId } from '@brightsign/bsdatamodel';
import { ArEventType, HSMStateData } from '../../type/runtime';
import { MediaZoneHSM } from './mediaZoneHSM';
import { CommandSequenceType } from '@brightsign/bscore';
import { HState } from './HSM';

export default class MrssState extends MediaHState {
  
  dataFeedId: BsDmId;

  liveDataFeed: any;
  currentFeed: any;
  pendingFeed: any;
  assetCollection: any;
  assetPoolFiles: any;
  displayIndex: any;
  firstItemDisplayed: boolean;

  constructor(zoneHSM: ZoneHSM, mediaState: DmMediaState, superState: HState, dataFeedId: BsDmId) {

    super(zoneHSM, mediaState.id);
    this.mediaState = mediaState;
    this.superState = superState;
    this.dataFeedId = dataFeedId;

    this.HStateEventHandler = this.STDisplayingMrssStateEventHandler;

    this.currentFeed = null;
    this.pendingFeed = null;
  }

  STDisplayingMrssStateEventHandler(event: ArEventType, stateData: HSMStateData): any {

    return (dispatch: any) => {
      if (event.EventType === 'ENTRY_SIGNAL') {
        console.log(this.id + ': entry signal');
        dispatch(this.executeMediaStateCommands(this.mediaState.id, this.stateMachine as MediaZoneHSM, CommandSequenceType.StateEntry));
        dispatch(this.launchTimer());

        this.firstItemDisplayed = false;
        // PreDrawImage
        // set default transition

        this.currentFeed = null;
        this.pendingFeed = null;

        // see if the designated feed has already been downloaded (doesn't imply content exists)
        
        return 'HANDLED';
      } else if (event.EventType === 'EXIT_SIGNAL') {
        dispatch(this.mediaHStateExitHandler());
      } else {
        return dispatch(this.mediaHStateEventHandler(event, stateData));
      }

      stateData.nextState = this.superState;
      return 'SUPER';
    };
  }
}
