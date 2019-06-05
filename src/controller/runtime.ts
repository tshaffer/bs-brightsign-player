import { isNil } from 'lodash';

// import {
//   // BsDmThunkAction,
//   dmOpenSign,
// } from '@brightsign/bsdatamodel';

import * as fs from 'fs-extra';
import isomorphicPath from 'isomorphic-path';

// import PlatformService from '../platform';

import { ArSyncSpec, ArFileLUT, ArSyncSpecDownload, ArEventType } from '../type/runtime';
import { HSM } from '../runtime/hsm/HSM';
import { PlayerHSM } from '../runtime/hsm/playerHSM';
import { BsBrightSignPlayerState } from '../index';
import { Store } from 'redux';
import {
  DmSignState,
  dmOpenSign,
  DmState,
  dmGetZonesForSign,
  BsDmId,
  DmZone,
  dmGetZoneById
} from '@brightsign/bsdatamodel';
import { ZoneHSM } from '../runtime/hsm/zoneHSM';
import { MediaZoneHSM } from '../runtime/hsm/mediaZoneHSM';

// TEDTODO - this should come from platform

// const srcDirectory = '/Users/tedshaffer/Desktop/ag';
let srcDirectory = '/Users/tedshaffer/Desktop/ag';
srcDirectory = '/storage/sd';
srcDirectory = '/sd:/';

var process = require("process");
process.chdir("/storage/sd");
srcDirectory = '';

// TEDTODO
let _autotronStore: Store<BsBrightSignPlayerState>;
let _syncSpec: ArSyncSpec;
let _poolAssetFiles: ArFileLUT;
let _autoSchedule: any;

let _hsmList: HSM[] = [];
let _playerHSM: PlayerHSM;

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

export function getReduxStore(): Store<BsAutotronState> {
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
  _playerHSM = new PlayerHSM('playerHSM', _autotronStore, startPlayback, restartPlayback, postMessage, dispatchEvent);
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

// failed try??
/*
export function dispatchPostMessage(event : ArEventType): void {
  _autotronStore.dispatch(postMessage(event));
  // postMessage(event);
}

function postMessage(event: ArEventType): () => void {
  return () => {
    dispatchEvent(event);
  };
}

// export function postRuntimeMessage(event: ArEventType) {
//   console.log('flibbet');
//   dispatchEvent(event);
// }

// export function postMessage(event: ArEventType) {
//   console.log('pizza');
//   dispatchEvent(event);
// }
*/

// restored code
// function dispatchPostMessage(event : ArEventType): void {
//   postMessage(event);
// }

export function postRuntimeMessage(event: ArEventType) {
  return ((dispatch: any, getState: Function) => {
    console.log('flibbet');
    dispatch(dispatchEvent(event));
  });
}

export function postMessage(event: ArEventType) {
  return ((dispatch: any, getState: Function) => {
    console.log('flibbet');
    dispatch(dispatchEvent(event));
  });
}
// end of restored code

function dispatchEvent(event: ArEventType): Function {

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
        zoneHSM = new MediaZoneHSM(zoneId + '-' + bsdmZone.type, _autotronStore, zoneId, dispatchEvent);
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


