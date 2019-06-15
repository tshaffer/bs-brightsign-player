import { isNil } from 'lodash';

// import {
//   // BsDmThunkAction,
//   dmOpenSign,
// } from '@brightsign/bsdatamodel';

import * as fs from 'fs-extra';
import isomorphicPath from 'isomorphic-path';

import { ArSyncSpec, ArFileLUT, ArSyncSpecDownload, ArEventType } from '../type/runtime';
import { HSM } from '../runtime/hsm/HSM';
import { PlayerHSM } from '../runtime/hsm/playerHSM';
import { BsBrightSignPlayerState } from '../index';
import { Store } from 'redux';
import { BsDmId } from '@brightsign/bsdatamodel';
import { DmState } from '@brightsign/bsdatamodel';
import { DmZone } from '@brightsign/bsdatamodel';

import {
  DmSignState,
  dmOpenSign,
  dmGetZonesForSign,
  dmGetZoneById
} from '@brightsign/bsdatamodel';
import { ZoneHSM } from '../runtime/hsm/zoneHSM';
import { MediaZoneHSM } from '../runtime/hsm/mediaZoneHSM';

// const platform = 'Desktop';
const platform: string = 'BrightSign';
console.log('Platform: ', platform);

// TEDTODO - this should come from platform

let srcDirectory = '';
if (platform === 'Desktop') {
  // srcDirectory = '/Users/tedshaffer/Desktop/ag';
  // const srcDirectory = '/Users/tedshaffer/Desktop/af';
  srcDirectory = '/Users/tedshaffer/Desktop/ae';
  // srcDirectory = '/Users/tedshaffer/Desktop/aa';
}
else {
  // TEDTODO - use the following when running on a BrightSign
  const process = require('process');
  process.chdir('/storage/sd');
  srcDirectory = '';
}
console.log('srcDirectory');
console.log(srcDirectory);

import Registry from '@brightsign/registry';
import { EventType } from '@brightsign/bscore';
const registry: Registry = new Registry();
registry.read('networking', 'ru')
  .then((keyValue) => {
    console.log('rs registry value is:');
    console.log(keyValue);
  });

declare class BSControlPort {
  constructor(portName : string);
}

// const getGpioControlPortPromise: Promise<any> = getControlPort('BrightSign');
const getBP900ControlPort0Promise: Promise<any> = getControlPort('TouchBoard-0-GPIO');
getBP900ControlPort0Promise
  .then( (controlPort) => {
    console.log('bp900ControlPort created');

    controlPort.oncontroldown = function (e: any) {
      console.log('### oncontroldown ' + e.code);
      const newtext = " DOWN: " + e.code + "\n";
      console.log(newtext);

      const event: ArEventType = {
        EventType: EventType.Bp,
      };
  
      console.log('********------- dispatch bp event');

      const reduxStore: any = getReduxStore();
      reduxStore.dispatch(dispatchHsmEvent(event));  
    };
  })
  .catch( (err) => {
    console.log(err);
  })

  // TEDTODO

let _autotronStore: Store<BsBrightSignPlayerState>;

let _syncSpec: ArSyncSpec;
let _poolAssetFiles: ArFileLUT;
let _autoSchedule: any;

let _hsmList: HSM[] = [];
let _playerHSM: PlayerHSM;

function getControlPort(portName : string) : any {
  return new Promise( (resolve : any) => {
    let controlPort : any = null;
    try {
      controlPort = new BSControlPort(portName);    
    }
    catch (e) {
      console.log('failed to create controlPort: ');
      console.log(portName);
    }
    resolve(controlPort);
  });
}

// -----------------------------------------------------------------------
// Controller Methods
// -----------------------------------------------------------------------
export function initRuntime(store: Store<BsBrightSignPlayerState>) {
  return ((dispatch: any, getState: Function) => {
    _autotronStore = store;
    const autotronState: BsBrightSignPlayerState = _autotronStore.getState();
    console.log(autotronState);

    return getRuntimeFiles();
  });
}

export function getReduxStore(): Store<BsBrightSignPlayerState> {
  return _autotronStore;
}

export function getRuntimeFiles(): Promise<void> {
  return getSyncSpec()
    .then((syncSpec: ArSyncSpec) => {
      _syncSpec = syncSpec;
      _poolAssetFiles = getPoolAssetFiles(syncSpec, getRootDirectory());
      return getAutoschedule(syncSpec, getRootDirectory());
    }).then((autoSchedule: any) => {
      _autoSchedule = autoSchedule;
      _hsmList = [];
      launchHSM();
      return Promise.resolve();
    });
}

function launchHSM() {
  _playerHSM = new PlayerHSM('playerHSM', _autotronStore, startPlayback, restartPlayback, postMessage, dispatchHsmEvent);
  _playerHSM.initialize();
}

function getAutoschedule(syncSpec: ArSyncSpec, rootPath: string) {
  return getSyncSpecReferencedFile('autoschedule.json', syncSpec, rootPath);
}

function getSyncSpecReferencedFile(fileName: string, syncSpec: ArSyncSpec, rootPath: string): Promise<object> {

  const syncSpecFile: ArSyncSpecDownload | null = getFile(syncSpec, fileName);
  if (syncSpecFile == null) {
    return Promise.reject('file not found');
  }

  // const fileSize = syncSpecFile.size;
  const filePath: string = isomorphicPath.join(rootPath, syncSpecFile.link);

  return fs.readFile(filePath, 'utf8')
    .then((fileStr: string) => {

      const file: object = JSON.parse(fileStr);

      // I have commented out the following code to allow hacking of files -
      // that is, overwriting files in the pool without updating the sync spec with updated sha1
      // if (fileSize !== fileStr.length) {
      //   debugger;
      // }
      return Promise.resolve(file);
    });
}

function getFile(syncSpec: ArSyncSpec, fileName: string): ArSyncSpecDownload | null {

  let file: ArSyncSpecDownload | null = null;

  syncSpec.files.download.forEach((syncSpecFile: ArSyncSpecDownload) => {
    if (syncSpecFile.name === fileName) {
      file = syncSpecFile;
      return;
    }
  });

  return file;
}

function getSyncSpec(): Promise<any> {
  return getSyncSpecFilePath()
    .then((syncSpecFilePath: string | null) => {
      if (!syncSpecFilePath) {
        // TEDTODO - error object
        return Promise.reject('no sync spec found');
      }
      else {
        return Promise.resolve(readSyncSpec(syncSpecFilePath));
      }
    });
}

function readSyncSpec(syncSpecFilePath: string): Promise<ArSyncSpec> {

  return fs.readFile(syncSpecFilePath, 'utf8')
    .then((syncSpecStr: string) => {
      const syncSpec: ArSyncSpec = JSON.parse(syncSpecStr);
      return Promise.resolve(syncSpec);
    });
}

function getPoolAssetFiles(syncSpec: ArSyncSpec, pathToRoot: string): ArFileLUT {

  const poolAssetFiles: ArFileLUT = {};

  syncSpec.files.download.forEach((syncSpecFile: ArSyncSpecDownload) => {
    poolAssetFiles[syncSpecFile.name] = isomorphicPath.join(pathToRoot, syncSpecFile.link);
  });

  return poolAssetFiles;
}

function getSyncSpecFilePath(): Promise<string | null> {
  console.log('invoked getLocalSyncSpec');
  return getLocalSyncSpec()
    .then((localSyncSpecFilePath) => {
      if (isNil(localSyncSpecFilePath)) {
        return getNetworkedSyncSpec();
      }
      else {
        return Promise.resolve(localSyncSpecFilePath);
      }
    });
}

function getNetworkedSyncSpec(): Promise<string | null> {
  const filePath: string = getNetworkedSyncSpecFilePath();
  return fs.pathExists(filePath)
    .then((exists: boolean) => {
      if (exists) {
        return Promise.resolve(filePath);
      }
      else {
        return Promise.resolve(null);
      }
    });
}

function getLocalSyncSpec(): Promise<string | null> {
  const filePath: string = getLocalSyncSpecFilePath();
  console.log('getLocalSyncSpec');
  console.log(filePath);
  return fs.pathExists(filePath)
    .then((exists: boolean) => {
      if (exists) {
        return Promise.resolve(filePath);
      }
      else {
        return Promise.resolve(null);
      }
    });
}

function getLocalSyncSpecFilePath(): string {
  // return isomorphicPath.join(PlatformService.default.getRootDirectory(), 'local-sync.json');
  const rootDirectory: string = getRootDirectory();
  console.log('rootDirectory:');
  console.log(rootDirectory);
  const syncSpecFilePath = isomorphicPath.join(rootDirectory, 'local-sync.json');
  console.log('syncSpecFilePath:');
  console.log(syncSpecFilePath);
  // return isomorphicPath.join(getRootDirectory(), 'local-sync.json');
  return syncSpecFilePath;
}

function getNetworkedSyncSpecFilePath(): string {
  console.log('getNetworkedSyncSpecFilePath');
  // return isomorphicPath.join(PlatformService.default.getRootDirectory(), 'current-sync.json');
  return isomorphicPath.join(getRootDirectory(), 'current-sync.json');
}

export function getPoolFilePath(fileName: string): string {
  const filePath: string = _poolAssetFiles[fileName];
  console.log('fileName: ' + fileName + ', filePath: ' + filePath);
  return filePath;
}

// function getPoolDirectory(): string {
//   return isomorphicPath.join(getRootDirectory(), 'pool');
// }

function getRootDirectory(): string {
  return srcDirectory;
}

function restartPlayback(presentationName: string): Promise<void> {

  console.log('restart: ', presentationName);

  const rootPath = getRootDirectory();

  // TEDTODO - only a single scheduled item is currently supported
  const scheduledPresentation = _autoSchedule.scheduledPresentations[0];
  const presentationToSchedule = scheduledPresentation.presentationToSchedule;

  // TEDTODO - why does restartPlayback get a presentationName if it's also in the schedule?
  // for switchPresentations?
  presentationName = presentationToSchedule.name;

  const autoplayFileName = presentationName + '.bml';

  return getSyncSpecReferencedFile(autoplayFileName, _syncSpec, rootPath)
    .then((bpfxState: any) => {
      console.log(bpfxState);
      const autoPlay: any = bpfxState.bsdm;
      const signState = autoPlay as DmSignState;
      _autotronStore.dispatch(dmOpenSign(signState));
      console.log(_autotronStore.getState());
      return Promise.resolve();
    });
}

export function postMessage(event: ArEventType) {
  return ((dispatch: any, getState: Function) => {
    dispatch(dispatchHsmEvent(event));
  });
}

export function dispatchHsmEvent(event: ArEventType): Function {

  return ((dispatch: any, getState: Function) => {
    dispatch(_playerHSM.Dispatch(event));

    _hsmList.forEach((hsm) => {
      dispatch(hsm.Dispatch(event));
    });
  });
}



function startPlayback() {

  const bsdm: DmState = _autotronStore.getState().bsdm;

  const zoneHSMs: ZoneHSM[] = [];
  const zoneIds: BsDmId[] = dmGetZonesForSign(bsdm);
  zoneIds.forEach((zoneId: BsDmId) => {
    const bsdmZone: DmZone = dmGetZoneById(bsdm, { id: zoneId }) as DmZone;

    let zoneHSM: ZoneHSM;

    switch (bsdmZone.type) {
      default: {
        zoneHSM = new MediaZoneHSM(zoneId + '-' + bsdmZone.type, _autotronStore, zoneId, dispatchHsmEvent);
        break;
      }
    }
    zoneHSMs.push(zoneHSM);
    _hsmList.push(zoneHSM);
  });

  zoneHSMs.forEach((zoneHSM: ZoneHSM) => {
    zoneHSM.constructorFunction();
    zoneHSM.initialize();
  });

}


