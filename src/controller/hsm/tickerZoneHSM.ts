import { ZoneHSM, } from './zoneHSM';
import { DmState, dmGetZoneById, DmZone } from '@brightsign/bsdatamodel';
import { DmTickerZoneProperties, BsDmId, dmGetInitialMediaStateIdForZone, DmMediaState, dmGetMediaStateById, dmGetMediaStateIdsForZone, DmContentItem, DmDataFeedContentItem } from '@brightsign/bsdatamodel';
import { isNil } from 'lodash';
import { HState, STTopEventHandler } from './HSM';
import { ContentItemType } from '@brightsign/bscore';
import RssState from './rssState';
import { ArEventType, HSMStateData } from '../../type/runtime';

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

    console.log(this.bsdmZone);
    const zoneProperties: DmTickerZoneProperties = this.bsdmZone.properties as DmTickerZoneProperties;
    const scrollSpeed = zoneProperties.scrollSpeed;
    const textWidget = zoneProperties.textWidget;
    const widget = zoneProperties.widget;

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
  constructor(stateMachine: TickerZoneHSM, id: string) {
    super(stateMachine, id);

    this.HStateEventHandler = this.STRSSDataFeedPlayingEventHandler;
    this.superState = stateMachine.stTop;
  }

  STRSSDataFeedPlayingEventHandler(event: ArEventType, stateData: HSMStateData): any {
    return (dispatch: any, getState: any) => {

      if (event.EventType === 'ENTRY_SIGNAL') {
        debugger;
        console.log('RSSDataFeedPlaying ' + this.id + ': entry signal');
        return 'HANDLED';
      }

      stateData.nextState = this.superState;
      return 'SUPER';
    }
  }

}