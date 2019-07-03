import { isNil } from 'lodash';
import { MediaHState } from './mediaHState';
import { ZoneHSM } from './zoneHSM';
import { DmMediaState, BsDmId } from '@brightsign/bsdatamodel';
import { ArEventType, HSMStateData } from '../../type/runtime';
import { MediaZoneHSM } from './mediaZoneHSM';
import { CommandSequenceType } from '@brightsign/bscore';
import { HState } from './HSM';
import { BsBrightSignPlayerState, BsBrightSignPlayerModelState } from '../../type/base';
import { DataFeed } from '../../type/dataFeed';
import { getDataFeedById } from '../../selector/dataFeed';
import { allDataFeedContentExists } from '../dataFeed';

import { postMessage } from '../runtime';

export default class MrssState extends MediaHState {
  
  dataFeedId: BsDmId;

  liveDataFeed: any;
  currentFeed: any;
  pendingFeed: any;
  assetCollection: any;
  assetPoolFiles: any;
  displayIndex: number;
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

    return (dispatch: any, getState: any) => {
      if (event.EventType === 'ENTRY_SIGNAL') {
        console.log(this.id + ': entry signal');
        dispatch(this.executeMediaStateCommands(this.mediaState.id, this.stateMachine as MediaZoneHSM, CommandSequenceType.StateEntry));

        this.firstItemDisplayed = false;
        // PreDrawImage
        // set default transition

        this.currentFeed = null;
        this.pendingFeed = null;

        // see if the designated feed has already been downloaded (doesn't imply content exists)
        const bsBrightSignPlayerState: BsBrightSignPlayerState = getState();
        const dataFeed: DataFeed | null = getDataFeedById(bsBrightSignPlayerState, this.dataFeedId);
        if (!isNil(dataFeed)) {
          this.displayIndex = 0;
          // distinguish between a feed that has no content and a feed in which no content has been downloaded
          if (dataFeed.items.length === 0 || (!allDataFeedContentExists(dataFeed))) {

            const mrssNotFullyLoadedPlaybackEvent: ArEventType = {
              EventType: 'MRSSNotFullyLoadedPlaybackEvent',
              EventData: dataFeed.id,
            };
            dispatch(postMessage(mrssNotFullyLoadedPlaybackEvent));
          }
          else {
            this.AdvanceToNextMRSSItem();
          }
        }
        else {
          // this situation will occur when the feed itself has not downloaded yet - send a message to self to trigger exit from state (like video playback failure)
          const mrssNotFullyLoadedPlaybackEvent: ArEventType = {
            EventType: 'MRSSNotFullyLoadedPlaybackEvent',
            EventData: this.dataFeedId,
          };
          dispatch(postMessage(mrssNotFullyLoadedPlaybackEvent));
          return 'HANDLED';
        }
        dispatch(this.launchTimer());
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

  AdvanceToNextMRSSItem() {
    console.log('poo');
  }
}
