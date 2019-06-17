import { ZoneHSM } from './zoneHSM';
import { Store } from 'redux';
import { BsBrightSignPlayerState } from '../../index';
import { DmState } from '@brightsign/bsdatamodel';
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

export class MediaZoneHSM extends ZoneHSM {

  mediaHStates: MediaHState[];

  mediaStateIdToHState: LUT = {};

  constructor(hsmId: string, autotronStore: Store<BsBrightSignPlayerState>, zoneId: string, dispatchEvent: any) {

    super(hsmId, autotronStore, zoneId, dispatchEvent);

    this.type = 'media';

    this.constructorHandler = this.videoOrImagesZoneConstructor;
    this.initialPseudoStateHandler = this.videoOrImagesZoneGetInitialState;

    // build playlist
    const bsdm: DmState = autotronStore.getState().bsdm;
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
    let newState: MediaHState;
    this.mediaStateIds.forEach((mediaStateId: BsDmId, index: number) => {
      const bsdmMediaState: DmMediaState = dmGetMediaStateById(bsdm, { id: mediaStateId }) as DmMediaState;
      if (bsdmMediaState.contentItem.type === 'Image') {
        newState = new ImageState(this, bsdmMediaState);
      }
      else if (bsdmMediaState.contentItem.type === 'Video') {
        newState = new VideoState(this, bsdmMediaState);
      }
      this.mediaHStates.push(newState);

      this.mediaStateIdToHState[mediaStateId] = newState;
    });
  }

  videoOrImagesZoneConstructor() {

    const bsdm: DmState = this.autotronStore.getState().bsdm;
    const initialMediaStateId: BsDmId | null = dmGetInitialMediaStateIdForZone(bsdm, { id: this.zoneId });
    if (!isNil(initialMediaStateId)) {
      const initialMediaState: DmMediaState = dmGetMediaStateById(bsdm, { id: initialMediaStateId }) as DmMediaState;
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

  // videoOrImagesZoneGetInitialState(): HState | null {
  videoOrImagesZoneGetInitialState(): any {
    return (dispatch: any) => {
      return this.activeState;
    };
  }

}
