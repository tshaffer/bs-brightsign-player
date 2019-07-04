import { isNil, isNumber } from 'lodash';
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

  waitForContentTimer: any;

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

      console.log('STDisplayingMrssStateEventHandler event received');
      console.log(event.EventType);
      if (event.EventType === 'INIT_SIGNAL') {
        debugger;
      }

      if (event.EventType === 'ENTRY_SIGNAL') {
        console.log('mrssState ' + this.id + ': entry signal');
        dispatch(this.executeMediaStateCommands(this.mediaState.id, this.stateMachine as MediaZoneHSM, CommandSequenceType.StateEntry));

        this.waitForContentTimer = null;

        this.firstItemDisplayed = false;
        // PreDrawImage
        // set default transition

        this.currentFeed = null;
        this.pendingFeed = null;

        // see if the designated feed has already been downloaded (doesn't imply content exists)
        const bsBrightSignPlayerState: BsBrightSignPlayerState = getState();
        const dataFeed: DataFeed | null = getDataFeedById(bsBrightSignPlayerState, this.dataFeedId);
        if (!isNil(dataFeed)) {

          console.log('STDisplayingMrssStateEventHandler: dataFeed not nil');

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
            this.advanceToNextMRSSItem();
          }
        }
        else {

          console.log('STDisplayingMrssStateEventHandler: dataFeed nil');

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

      } else if (event.EventType === 'MRSSNotFullyLoadedPlaybackEvent') {
        console.log('MRSSNotFullyLoadedPlaybackEvent received');
        const dataFeedId: string = event.EventData;
        if (dataFeedId === this.dataFeedId) {
          /*
          if type(m.signChannelEndEvent) = "roAssociativeArray" then
            return m.ExecuteTransition(m.signChannelEndEvent, stateData, "")
          else if type(m.currentFeed) = "roAssociativeArray" and m.currentFeed.ContentExists(m.assetPoolFiles) then
            m.AdvanceToNextMRSSItem()
            '' redundant check
            ''					else if type(m.currentFeed) = "roAssociativeArray" and type(m.currentFeed.items) = "roArray" and m.currentFeed.items.Count() = 0 then
            ''						m.LaunchWaitForContentTimer()
          else
            m.LaunchWaitForContentTimer()
          end if
          */
         dispatch(this.launchWaitForContentTimer());
        }
      } else if (event.EventType === 'MRSS_SPEC_UPDATED') {
        console.log('mrssSpecUpdated');
      } else {
        return dispatch(this.mediaHStateEventHandler(event, stateData));
      }

      stateData.nextState = this.superState;
      return 'SUPER';
    };
  }

  advanceToNextMRSSItem() {
    console.log('************ AdvanceToNextMRSSItem');
  }

  launchWaitForContentTimer(): any {
    return (dispatch: any, getState: any) => {
      if (isNumber(this.waitForContentTimer)) {
        clearTimeout(this.waitForContentTimer);
      }

      console.log('************ launchWaitForContentTimer');

      const timeoutDuration: number = 1;
      this.waitForContentTimer = setTimeout(this.waitForContentTimeoutHandler, timeoutDuration * 1000, this);
    };
  }

  waitForContentTimeoutHandler(mediaHState: MediaHState) {
/*
      if type(m.currentFeed) <> "roAssociativeArray" or not m.currentFeed.AllContentExists(m.assetPoolFiles) then
        if type(m.currentFeed) = "roAssociativeArray" and m.currentFeed.ContentExists(m.assetPoolFiles) then
          if m.displayIndex = invalid then
            m.displayIndex = 0
          end if
          m.AdvanceToNextMRSSItem()
        else
          m.LaunchWaitForContentTimer()
        end if
      else if type(m.currentFeed) = "roAssociativeArray" and type(m.currentFeed.items) = "roArray" and m.currentFeed.items.Count() = 0 then
        m.LaunchWaitForContentTimer()
      else
        m.displayIndex = 0
        m.AdvanceToNextMRSSItem()
      end if
      
      return "HANDLED"
*/    
    console.log('************ waitForContentTimeoutHandler');

  }


}
