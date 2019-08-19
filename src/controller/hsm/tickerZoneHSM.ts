import { ZoneHSM, } from './zoneHSM';
import { DmState, dmGetZoneById, DmZone } from '@brightsign/bsdatamodel';
import { DmTickerZoneProperties, BsDmId, dmGetInitialMediaStateIdForZone, DmMediaState, dmGetMediaStateById, dmGetMediaStateIdsForZone, DmContentItem, DmDataFeedContentItem, DmcDataFeed } from '@brightsign/bsdatamodel';
import { isNil, isObject } from 'lodash';
import { HState, STTopEventHandler } from './HSM';
import { ContentItemType } from '@brightsign/bscore';
import { ArEventType, HSMStateData } from '../../type/runtime';
import { getDataFeedById } from '../../selector/dataFeed';
import { ArTextFeed, ArTextItem } from '../../type/dataFeed';

export class TickerZoneHSM extends ZoneHSM {

  bsdm: DmState;

  hStates: HState[];

  stTop: HState;
  stRSSDataFeedInitialLoad: HState;
  stRSSDataFeedPlaying: HState;

  rssDataFeedItems: any[];

  constructor(hsmId: string, zoneId: string, dispatchEvent: any, bsdm: DmState) {

    super(hsmId, zoneId, dispatchEvent, bsdm);

    this.bsdm = bsdm;

    this.rssDataFeedItems = [];

    this.constructorHandler = this.tickerZoneConstructor;
    this.initialPseudoStateHandler = this.tickerZoneGetInitialState;

    this.bsdmZone = dmGetZoneById(bsdm, { id: zoneId }) as DmZone;

    this.id = this.bsdmZone.id;
    this.name = this.bsdmZone.name;

    this.x = this.bsdmZone.position.x;
    this.y = this.bsdmZone.position.y;
    this.width = this.bsdmZone.position.width;
    this.height = this.bsdmZone.position.height;

    this.initialMediaStateId = this.bsdmZone.initialMediaStateId;
    this.mediaStateIds = dmGetMediaStateIdsForZone(bsdm, { id: zoneId });

    this.stTop = new HState(this, 'Top');
    this.stTop.HStateEventHandler = STTopEventHandler;

    this.stRSSDataFeedInitialLoad = new STRSSDataFeedInitialLoad(this, 'RSSDataFeedInitialLoad');
    this.stRSSDataFeedPlaying = new STRSSDataFeedPlaying(this, 'RSSDataFeedPlaying');

    // retrieve the data feeds associated with this zone
    // see newPlaylist in autorun - 'Ticker'
    for (const mediaStateId of this.mediaStateIds) {
      const bsdmMediaState: DmMediaState = dmGetMediaStateById(bsdm, { id: mediaStateId }) as DmMediaState;

      switch (bsdmMediaState.contentItem.type) {
        case ContentItemType.DataFeed:
          const tickerItem: any = this.getTickerItem(bsdmMediaState.contentItem as DmDataFeedContentItem);
          this.rssDataFeedItems.push(tickerItem);
          break;
        default:
          debugger;
      }
    }
  }

  tickerZoneConstructor() {
    const initialMediaStateId: BsDmId | null = dmGetInitialMediaStateIdForZone(this.bsdm, { id: this.zoneId });
    if (!isNil(initialMediaStateId)) {
      const initialMediaState: DmMediaState = dmGetMediaStateById(this.bsdm, { id: initialMediaStateId }) as DmMediaState;
    }
  }

  tickerZoneGetInitialState(): any {
    return (dispatch: any) => {
      this.activeState = this.stRSSDataFeedInitialLoad;
      return Promise.resolve(this.activeState);
    };
  }

  // see newTickerItem in autorun
  getTickerItem(dataFeedContentItem: DmDataFeedContentItem): any {
    return this.getRSSDataFeedItem(dataFeedContentItem);
  }

  // see newRSSDataFeedPlaylistItem in autorun
  getRSSDataFeedItem(dataFeedContentItem: DmDataFeedContentItem): any {
    const rssDataFeedItem: any = {}
    rssDataFeedItem.dataFeedId = dataFeedContentItem.dataFeedId;
    return rssDataFeedItem;
  }
}

class STRSSDataFeedInitialLoad extends HState {

  constructor(stateMachine: TickerZoneHSM, id: string) {
    super(stateMachine, id);

    this.HStateEventHandler = this.STRSSDataFeedInitialLoadEventHandler;
    this.superState = stateMachine.stTop;
  }

  STRSSDataFeedInitialLoadEventHandler(event: ArEventType, stateData: HSMStateData): any {

    return (dispatch: any, getState: any) => {

      if (event.EventType === 'ENTRY_SIGNAL') {
        console.log('RSSDataFeedInitialLoad ' + this.id + ': entry signal');
        return 'HANDLED';
      }
      else if (event.EventType === 'LIVE_DATA_FEED_UPDATE') {
        console.log(event);
        const dataFeedId = event.EventData as BsDmId;
        stateData.nextState = (this.stateMachine as TickerZoneHSM).stRSSDataFeedPlaying;
        return 'TRANSITION';
      }

      stateData.nextState = this.superState;
      return 'SUPER';
    }
  }
}

class STRSSDataFeedPlaying extends HState {

  bsTicker: BSTicker;


  constructor(stateMachine: TickerZoneHSM, id: string) {
    super(stateMachine, id);

    this.HStateEventHandler = this.STRSSDataFeedPlayingEventHandler;
    this.superState = stateMachine.stTop;
  }

  STRSSDataFeedPlayingEventHandler(event: ArEventType, stateData: HSMStateData): any {
    return (dispatch: any, getState: any) => {

      if (event.EventType === 'ENTRY_SIGNAL') {
        console.log('RSSDataFeedPlaying ' + this.id + ': entry signal');
        dispatch(this.populateRSSDataFeedWidget());
        return 'HANDLED';
      }

      stateData.nextState = this.superState;
      return 'SUPER';
    }
  }

  populateRSSDataFeedWidget() {

    return (dispatch: any, getState: any) => {

      const tickerZoneHSM: TickerZoneHSM = this.stateMachine as TickerZoneHSM;
      const tickerZoneProperties: DmTickerZoneProperties = tickerZoneHSM.bsdmZone.properties as DmTickerZoneProperties;

      debugger;

      // only support 1 for now
      let dataFeed: ArTextFeed | null = null;
      for (const rssDataFeedItem of tickerZoneHSM.rssDataFeedItems) {
        const dataFeedId: BsDmId = rssDataFeedItem.dataFeedId;
        dataFeed = getDataFeedById(getState(), dataFeedId) as ArTextFeed;
      }

      try {
        if (!isObject(this.bsTicker)) {

          const { x, y, width, height } = tickerZoneHSM.bsdmZone.position;
          const { scrollSpeed, textWidget, widget } = tickerZoneProperties;

          // should use a value derived from textWidget.rotation instead of 0.
          this.bsTicker = new BSTicker(x, y, width, height, 0);
          // set other bsTicker parameters here
          // this.bsTicker = new BSTicker(10, 700, 1200, 30, 0);
          // this.bsTicker.AddString("addText1");
          // this.bsTicker.AddString("addText2");
          // this.bsTicker.AddString("addText3");
          // this.bsTicker.SetBackgroundColor(0xFFFF0000);
          // this.bsTicker.SetForegroundColor(0xFF007700);
          // this.bsTicker.SetSeparatorString(" ### ");

          if (!isNil(dataFeed)) {
            const textItems: ArTextItem[] = dataFeed.textItems;
            for (const textItem of textItems) {
              this.bsTicker.AddString(textItem.articleDescription);
            }
          }
        }
      }
      catch (e) {
        console.log('failed to create bsTicker: ');
        return;
      }
    }
  }

}