import { ZoneHSM } from './zoneHSM';
import { DmState, dmGetContainedMediaStateIdsForMediaState, DmcMediaState } from '@brightsign/bsdatamodel';
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
import VideoState from './videoState';
import { isNil } from 'lodash';
import { ContentItemType } from '@brightsign/bscore';
import SuperState from './superState';

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
      newState = this.getHStateFromMediaState(bsdm, bsdmMediaState);
      if (!isNil(newState)) {
        this.mediaHStates.push(newState);
        this.mediaStateIdToHState[mediaStateId] = newState;
      }
    }

    console.log('end of mediaZoneHSM constructor');
    console.log(this.mediaHStates);
    console.log(this.mediaStateIdToHState);
    debugger;
  }

  getHStateFromMediaState(bsdm: DmState, bsdmMediaState: DmMediaState): MediaHState | null {

    let newState: MediaHState | null = null;

    const contentItemType = bsdmMediaState.contentItem.type;
    switch (contentItemType) {
      case ContentItemType.Image:
        newState = new ImageState(this, bsdmMediaState);
        break;
      case ContentItemType.Video:
        newState = new VideoState(this, bsdmMediaState);
        break;
      case ContentItemType.SuperState:
        newState = this.buildSuperState(bsdm, bsdmMediaState);
        break;
      default:
        break;
    }

    return newState;
  }

  buildSuperState(bsdm: DmState, bsdmSuperState: DmMediaState): MediaHState {
    const superState: MediaHState = new SuperState(this, bsdmSuperState);
    this.getSuperStateContent(bsdm, bsdmSuperState);
    return superState;
  }

  getSuperStateContent(bsdm: DmState, bsdmSuperState: DmMediaState) {
    
    const superStateId: BsDmId = bsdmSuperState.id; // id of superStateItem
    const mediaStateIds: BsDmId[] = dmGetContainedMediaStateIdsForMediaState(bsdm, { id: superStateId });
  
    let newState: MediaHState | null = null;
    for (const mediaStateId of mediaStateIds) {
      const bsdmMediaState: DmMediaState = dmGetMediaStateById(bsdm, { id: mediaStateId }) as DmMediaState;
      newState = this.getHStateFromMediaState(bsdm, bsdmMediaState);
      if (!isNil(newState)) {
        this.mediaHStates.push(newState);
        this.mediaStateIdToHState[mediaStateId] = newState;
      }
    }
  }
  
  videoOrImagesZoneConstructor() {

    const initialMediaStateId: BsDmId | null = dmGetInitialMediaStateIdForZone(this.bsdm, { id: this.zoneId });
    if (!isNil(initialMediaStateId)) {
      const initialMediaState: DmMediaState = dmGetMediaStateById(this.bsdm, { id: initialMediaStateId }) as DmMediaState;
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
