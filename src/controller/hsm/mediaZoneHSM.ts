import { ZoneHSM } from './zoneHSM';
import { DmState, dmGetContainedMediaStateIdsForMediaState, DmSuperStateContentItem, DmDataFeedContentItem } from '@brightsign/bsdatamodel';
import { DmZone } from '@brightsign/bsdatamodel';
import { BsDmId } from '@brightsign/bsdatamodel';
import { DmMediaState } from '@brightsign/bsdatamodel';

import {
  dmGetZoneById,
  dmGetMediaStateIdsForZone,
  dmGetMediaStateById,
  dmGetInitialMediaStateIdForZone
} from '@brightsign/bsdatamodel';
import { MediaHState } from './mediaHState';
import { LUT } from '../../type/runtime';
// import { HState } from './HSM';
import ImageState from './imageState';
import MrssState from './mrssState';
import VideoState from './videoState';
import { isNil } from 'lodash';
import { ContentItemType } from '@brightsign/bscore';
import SuperState from './superState';
import { HState } from './HSM';

export class MediaZoneHSM extends ZoneHSM {

  bsdm: DmState;
  mediaHStates: MediaHState[];

  mediaStateIdToHState: LUT = {};

  constructor(hsmId: string, zoneId: string, dispatchEvent: any, bsdm: DmState) {

    super(hsmId, zoneId, dispatchEvent, bsdm);

    this.type = 'media';
    this.bsdm = bsdm;

    this.constructorHandler = this.videoOrImagesZoneConstructor;
    this.initialPseudoStateHandler = this.videoOrImagesZoneGetInitialState;

    // build playlist
    this.bsdmZone = dmGetZoneById(bsdm, { id: zoneId }) as DmZone;

    this.id = this.bsdmZone.id;
    this.name = this.bsdmZone.name;

    this.x = this.bsdmZone.position.x;
    this.y = this.bsdmZone.position.y;
    this.width = this.bsdmZone.position.width;
    this.height = this.bsdmZone.position.height;

    this.initialMediaStateId = this.bsdmZone.initialMediaStateId;
    this.mediaStateIds = dmGetMediaStateIdsForZone(bsdm, { id: zoneId });

    this.mediaHStates = [];

    // states
    let newState: MediaHState | null = null;
    for (const mediaStateId of this.mediaStateIds) {
      const bsdmMediaState: DmMediaState = dmGetMediaStateById(bsdm, { id: mediaStateId }) as DmMediaState;
      newState = this.getHStateFromMediaState(bsdm, bsdmMediaState, this.stTop);
      if (!isNil(newState)) {
        this.mediaHStates.push(newState);
        this.mediaStateIdToHState[mediaStateId] = newState;
      }
    }

    console.log('end of mediaZoneHSM constructor');
    console.log(this.mediaHStates);
    console.log(this.mediaStateIdToHState);
  }

  getHStateFromMediaState(bsdm: DmState, bsdmMediaState: DmMediaState, superState: HState): MediaHState | null {

    let newState: MediaHState | null = null;

    const contentItemType = bsdmMediaState.contentItem.type;
    switch (contentItemType) {
      case ContentItemType.Image:
        newState = new ImageState(this, bsdmMediaState, superState);
        break;
      case ContentItemType.Video:
        newState = new VideoState(this, bsdmMediaState, superState);
        break;
      case ContentItemType.SuperState:
        newState = this.buildSuperState(bsdm, bsdmMediaState, superState);
        break;
      case ContentItemType.MrssFeed:
        const dataFeedContentItem: DmDataFeedContentItem = bsdmMediaState.contentItem as DmDataFeedContentItem;
        const dataFeedId: BsDmId = dataFeedContentItem.dataFeedId;
        newState = new MrssState(this, bsdmMediaState, superState, dataFeedId);
        break;
      default:
        break;
    }

    return newState;
  }

  buildSuperState(bsdm: DmState, bsdmSuperState: DmMediaState, superState: HState): MediaHState {

    const newSuperState: MediaHState = new SuperState(this, bsdmSuperState, superState);
    this.getSuperStateContent(bsdm, newSuperState, bsdmSuperState);
    return newSuperState;
  }

  getSuperStateContent(bsdm: DmState, superHState: HState, bsdmSuperState: DmMediaState) {

    const superStateId: BsDmId = bsdmSuperState.id; // id of superStateItem
    const mediaStateIds: BsDmId[] = dmGetContainedMediaStateIdsForMediaState(bsdm, { id: superStateId });

    let newHState: MediaHState | null = null;
    for (const mediaStateId of mediaStateIds) {
      const bsdmMediaState: DmMediaState = dmGetMediaStateById(bsdm, { id: mediaStateId }) as DmMediaState;
      newHState = this.getHStateFromMediaState(bsdm, bsdmMediaState, superHState);
      if (!isNil(newHState)) {
        this.mediaHStates.push(newHState);
        this.mediaStateIdToHState[mediaStateId] = newHState;
      }
    }
  }

  getInitialState(bsdm: DmState, mediaState: DmMediaState): DmMediaState {

    if (mediaState.contentItem.type !== ContentItemType.SuperState) {
      return mediaState;
    }

    const superStateContentItem: DmSuperStateContentItem = mediaState.contentItem as DmSuperStateContentItem;
    const initialMediaState: DmMediaState | null = dmGetMediaStateById(bsdm, { id: superStateContentItem.initialMediaStateId });
    if (!isNil(initialMediaState)) {
      return this.getInitialState(bsdm, initialMediaState);
    }

    // TEDTODO throw error
    return mediaState;
  }

  videoOrImagesZoneConstructor() {

    // get the initial media state for the zone
    const initialMediaStateId: BsDmId | null = dmGetInitialMediaStateIdForZone(this.bsdm, { id: this.zoneId });
    if (!isNil(initialMediaStateId)) {
      let initialMediaState: DmMediaState = dmGetMediaStateById(this.bsdm, { id: initialMediaStateId }) as DmMediaState;
      initialMediaState = this.getInitialState(this.bsdm, initialMediaState);
      for (const mediaHState of this.mediaHStates) {
        if (mediaHState.mediaState.id === initialMediaState.id) {
          this.activeState = mediaHState;
          return;
        }
      }
    }

    // TEDTODO - verify that setting activeState to null is correct OR log error
    this.activeState = null;
  }

  videoOrImagesZoneGetInitialState(): any {
    return (dispatch: any) => {
      return this.activeState;
    };
  }

}
