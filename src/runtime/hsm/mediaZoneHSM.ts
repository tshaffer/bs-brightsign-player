import { ZoneHSM } from "./zoneHSM";
import { Store } from "redux";
import { BsBrightSignPlayerState } from "../../index";
import { 
  dmGetZoneById, 
  DmZone, 
  DmState, 
  BsDmId, 
  DmMediaState, 
  dmGetMediaStateIdsForZone, 
  dmGetMediaStateById, 
  dmGetEventIdsForMediaState} from "@brightsign/bsdatamodel";
import { MediaHState } from './mediaHState';
import { LUT } from "../../type/runtime";
import { HState } from "./HSM";
import ImageState from "./imageState";
import VideoState from "./videoState";

export class MediaZoneHSM extends ZoneHSM {

  mediaStateIdToHState: LUT = {};

  constructor(autotronStore: Store<BsBrightSignPlayerState>, zoneId: string, dispatchEvent: any) {

    super(autotronStore, zoneId, dispatchEvent);

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
    this.mediaStates = [];

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
      this.mediaStates.push(newState);

      this.mediaStateIdToHState[mediaStateId] = newState;
    });

    // events / transitions
    this.mediaStateIds.forEach( (mediaStateId : BsDmId, index : number) => {

      const targetHState : MediaHState = this.mediaStateIdToHState[mediaStateId];

      const eventIds : BsDmId[] = dmGetEventIdsForMediaState(bsdm, { id : mediaStateId });
      targetHState.addEvents(this, eventIds);
    });
  }

  videoOrImagesZoneConstructor() {
    console.log('VideoOrImagesZoneConstructor invoked');

    // const mediaStateIds = dmGetZoneSimplePlaylist(this.bsdm, { id: this.zoneId });
    // should really look at initialMediaStateId, but the following should work for non interactive playlists
    this.activeState = this.mediaStates[0];
  }

  videoOrImagesZoneGetInitialState(): HState | null {
    console.log('videoOrImagesZoneGetInitialState invoked');

    return this.activeState;
  }

}
