import { HSM, HState, STTopEventHandler } from './HSM';
import {
  dmGetZoneById,
  dmGetZoneSimplePlaylist
} from '@brightsign/bsdatamodel';
import { BsDmId } from '@brightsign/bsdatamodel';
import { DmState } from '@brightsign/bsdatamodel';
import { DmZone } from '@brightsign/bsdatamodel';

export class ZoneHSM extends HSM {

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

  constructor(hsmId: string, zoneId: string, dispatchEvent: any, bsdm: DmState) {

    super(hsmId, dispatchEvent);

    this.zoneId = zoneId;

    this.stTop = new HState(this, 'Top');
    this.stTop.HStateEventHandler = STTopEventHandler;
    this.topState = this.stTop;

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