import { HSM, HState, STTopEventHandler } from './HSM';
import {
  dmGetZoneById,
  dmGetZoneSimplePlaylist
} from '@brightsign/bsdatamodel';
import { BsDmId } from '@brightsign/bsdatamodel';
import { DmState } from '@brightsign/bsdatamodel';
import { DmZone } from '@brightsign/bsdatamodel';

import { Store } from 'redux';
import { BsBrightSignPlayerState } from '../../index';

export class ZoneHSM extends HSM {

  autotronStore: Store<BsBrightSignPlayerState>;
  bsdmZone: DmZone;

  type: string;
  zoneId: string;
  stTop: HState;

  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  initialMediaStateId: string;
  mediaStateIds: BsDmId[];

  constructor(hsmId: string, autotronStore: Store<BsBrightSignPlayerState>, zoneId: string, dispatchEvent: any) {

    super(hsmId, autotronStore, dispatchEvent);

    this.autotronStore = autotronStore;
    this.zoneId = zoneId;

    this.stTop = new HState(this, 'Top');
    this.stTop.HStateEventHandler = STTopEventHandler;
    this.topState = this.stTop;

    const bsdm: DmState = autotronStore.getState().bsdm;
    this.bsdmZone = dmGetZoneById(bsdm, { id: zoneId }) as DmZone;

    this.id = this.bsdmZone.id;
    this.name = this.bsdmZone.name;

    this.x = this.bsdmZone.position.x;
    this.y = this.bsdmZone.position.y;
    this.width = this.bsdmZone.position.width;
    this.height = this.bsdmZone.position.height;

    this.initialMediaStateId = this.bsdmZone.initialMediaStateId;
    this.mediaStateIds = dmGetZoneSimplePlaylist(bsdm, { id: zoneId }) as BsDmId[];
  }
}