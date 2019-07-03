import { HState } from '../controller/hsm/HSM';
import { DmState } from '@brightsign/bsdatamodel';

export interface ArEventType {
  EventType: string;
  data?: any;
  EventData?: any;
}

export interface HSMStateData {
  nextState: HState | null;
}

export interface ArSyncSpecHash {
  method : string;
  hex : string;
}

export interface ArSyncSpecDownload {
  name : string;
  hash : ArSyncSpecHash;
  size : number;
  link : string;
}

export interface ArSyncSpecFiles {
  download : ArSyncSpecDownload[];
  ignore : any;
  delete : any;
}

export interface ArSyncSpec {
  meta : any;
  files : any;
}

export type ArFileLUT = { [fileName:string]: string };

export type LUT = { [key: string] : any };

export type SubscribedEvents = { [ eventKey : string] : HState}

export type StateMachineShape = { };

export interface ArState {
  bsdm : DmState;
  stateMachine : StateMachineShape;
  // dataFeeds : DataFeedShape;
  // mrssDataFeedItems : MrssDataFeedItemShape;
}
