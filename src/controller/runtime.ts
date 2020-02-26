import { isNil } from 'lodash';

import * as fs from 'fs-extra';
import isomorphicPath from 'isomorphic-path';

import { ArSyncSpec, ArFileLUT, ArSyncSpecDownload, ArEventType } from '../type/runtime';
import { HSM } from './hsm/HSM';
import { PlayerHSM } from './hsm/playerHSM';
import { BsBrightSignPlayerState, addUserVariable, BsBrightSignPlayerModelThunkAction } from '../index';
import { Store } from 'redux';
import { BsDmId, dmGetUserVariableIdsForSign, dmGetUserVariableById, DmcUserVariable } from '@brightsign/bsdatamodel';
import { DmState } from '@brightsign/bsdatamodel';
import { DmZone } from '@brightsign/bsdatamodel';

import {
  DmSignState,
  dmOpenSign,
  dmGetZonesForSign,
  dmGetZoneById
} from '@brightsign/bsdatamodel';
import { ZoneHSM } from './hsm/zoneHSM';
import { MediaZoneHSM } from './hsm/mediaZoneHSM';

import {
  initializeButtonPanels
} from './device/bp';

// import express from 'express';
// import * as fs from 'fs-extra';
// import isomorphicPath from 'isomorphic-path';
// import { getRootDirectory, getPoolDirectory } from './runtime';
import { FileToPublish, ContentFileMap, FilesToPublishMap } from '../type';
import { SyncSpecDownload, SyncSpec, SyncSpecFiles } from '../type';
// import { isNil } from 'lodash';


// const platform: string = 'Desktop';
// const platform: string = 'BrightSign';
let platform: string;

try {
  const gpio = new BSControlPort('BrightSign') as any;
  console.log('create controlPort: ');
  console.log(gpio);
  platform = 'BrightSign';
}
catch (e) {
  platform = 'Desktop';
  console.log('failed to create controlPort: ');
}
// TEDTODO - failing to create control port - overwrite
// platform = 'BrightSign';

let srcDirectory = '';
if (platform === 'Desktop') {
  // srcDirectory = '/Users/tedshaffer/Desktop/autotron';
  srcDirectory = '/Users/tedshaffer/Desktop/autotron';
}
else {
  const process = require('process');
  process.chdir('/storage/sd');
  srcDirectory = '';
}

import Registry from '@brightsign/registry';
import { ZoneType } from '@brightsign/bscore';
import { TickerZoneHSM } from './hsm/tickerZoneHSM';
const registry: Registry = new Registry();
registry.read('networking', 'ru')
  .then((keyValue) => {
  });

let _autotronStore: Store<BsBrightSignPlayerState>;
let _syncSpec: ArSyncSpec;
let _poolAssetFiles: ArFileLUT;
let _autoSchedule: any;

const _queuedEvents: ArEventType[] = [];
let _hsmList: HSM[] = [];
let _playerHSM: PlayerHSM;

// Express initialization
const express = require('express');
const app = express();
const multer = require('multer');
const upload = multer();

// with this syntax, the file is uploaded to uploads/
// const uploadManifest = multer({ dest: 'uploads/' })

// with this syntax, the file information is available via req.files. included is a buffer with the content of the upload
const uploadManifest = multer();

const uploadLfnTransfers = multer({ dest: 'lfnTransfers/' });
const uploadLfnSyncSpec = multer({ dest: 'syncSpec/' });

const port = 8080;

app.get('/', (req: any, res: any) => res.send('Hello World!'));
app.get('/v2/device/status', (req: any, res: any) => handleStatus(req, res));

app.get('/v2/device/configuration', (req: any, res: any) => handleConfiguration(req, res));
app.post('/v2/storage/configuration', upload.none(), (req: any, res: any, next: any) => handleStorageConfiguration(req, res));

// app.post('/v2/publish', uploadManifest.single('filesToPublish.json'), (req: any, res: any) => handlePublish(req, res));
// This approach works for the method I want; unable to get .single() to work.
app.post('/v2/publish', uploadManifest.any(), (req: any, res: any) => handlePublish(req, res));

app.post('/v2/publish/file', uploadLfnTransfers.any(), (req: any, res: any) => handlePublishFile(req, res));

app.post('/v2/publish/sync', uploadLfnSyncSpec.any(), (req: any, res: any) => handlePublishSync(req, res));


app.listen(port, () => console.log(`Example app listening on port ${port}!`));


// -----------------------------------------------------------------------
// Controller Methods
// -----------------------------------------------------------------------

initializeButtonPanels();

export function getPlatform(): string {
  return platform;
}

export function initRuntime(store: Store<BsBrightSignPlayerState>) {
  return ((dispatch: any, getState: () => BsBrightSignPlayerState) => {
    _autotronStore = store;
    return getRuntimeFiles()
      .then(() => {
        dispatch(launchHSM());
      });
  });
}

export function getReduxStore(): Store<BsBrightSignPlayerState> {
  return _autotronStore;
}

let _videoElementRef: any;
export function tmpSetVideoElementRef(videoElementRef: any) {
  _videoElementRef = videoElementRef;
}
export function tmpGetVideoElementRef(): any {
  return _videoElementRef;
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
      // launchHSM();
      return Promise.resolve();
    });
}

function launchHSM() {
  return ((dispatch: any) => {
    _playerHSM = new PlayerHSM('playerHSM', startPlayback, restartPlayback, postMessage, queueHsmEvent);
    const action: any = _playerHSM.hsmInitialize().bind(_playerHSM);
    dispatch(action).then(() => {
      const hsmInitializationComplete = hsmInitialized();
      console.log('69696969 - end of launchHSM, hsmInitializationComplete = ' + hsmInitializationComplete);
    });
  });
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
  const syncSpecFilePath = isomorphicPath.join(rootDirectory, 'local-sync.json');
  // return isomorphicPath.join(getRootDirectory(), 'local-sync.json');
  return syncSpecFilePath;
}

function getNetworkedSyncSpecFilePath(): string {
  // return isomorphicPath.join(PlatformService.default.getRootDirectory(), 'current-sync.json');
  return isomorphicPath.join(getRootDirectory(), 'current-sync.json');
}

export function getPoolFilePath(fileName: string): string {
  const filePath: string = _poolAssetFiles[fileName];
  return filePath;
}

export function getPoolDirectory(): string {
  return isomorphicPath.join(getRootDirectory(), 'pool');
}

export function getFeedDirectory(): string {
  return isomorphicPath.join(getRootDirectory(), 'feedPool');
}

export function getRootDirectory(): string {
  return srcDirectory;
}

function restartPlayback(presentationName: string): Promise<void> {

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
      const autoPlay: any = bpfxState.bsdm;
      const signState = autoPlay as DmSignState;
      _autotronStore.dispatch(dmOpenSign(signState));

      // populate user variables from the sign.
      // set current values === default values for now
      const bsdm: DmState = _autotronStore.getState().bsdm;
      const userVariableIds: BsDmId[] = dmGetUserVariableIdsForSign(bsdm);
      for (const userVariableId of userVariableIds) {
        const userVariable = dmGetUserVariableById(bsdm, { id: userVariableId }) as DmcUserVariable;
        _autotronStore.dispatch(addUserVariable(userVariableId, userVariable.defaultValue));
      }

      return Promise.resolve();
    });
}

export function postMessage(event: ArEventType) {
  return ((dispatch: any) => {
    dispatch(queueHsmEvent(event));
  });
}

export function hsmInitialized(): boolean {

  if (!_playerHSM.initialized) {
    return false;
  }

  if (_hsmList.length === 0) {
    return false;
  }

  for (const hsm of _hsmList) {
    if (!hsm.initialized) {
      return false;
    }
  }

  return true;
}


export function queueHsmEvent(event: ArEventType) {
  return ((dispatch: any) => {
    if (event.EventType !== 'NOP') {
      _queuedEvents.push(event);
    }
    if (hsmInitialized()) {
      while (_queuedEvents.length > 0) {
        dispatch(dispatchHsmEvent(_queuedEvents[0]));
        _queuedEvents.shift();
      }
    }
  });
}

function dispatchHsmEvent(
  event: ArEventType
  // ): BsBrightSignPlayerModelThunkAction<undefined | void> {
): any {

  return ((dispatch: any) => {

    console.log('dispatchHsmEvent:');
    console.log(event.EventType);

    let action = _playerHSM.hsmDispatch(event).bind(_playerHSM);
    dispatch(action);

    _hsmList.forEach((hsm) => {
      action = hsm.hsmDispatch(event).bind(hsm);
      dispatch(action);
    });
  });
}


function startPlayback() {

  return (dispatch: any, getState: any) => {

    const bsdm: DmState = getState().bsdm;

    const zoneHSMs: ZoneHSM[] = [];
    const zoneIds: BsDmId[] = dmGetZonesForSign(bsdm);
    zoneIds.forEach((zoneId: BsDmId) => {
      const bsdmZone: DmZone = dmGetZoneById(bsdm, { id: zoneId }) as DmZone;

      let zoneHSM: ZoneHSM;

      switch (bsdmZone.type) {
        case ZoneType.Ticker: {
          zoneHSM = new TickerZoneHSM(zoneId + '-' + bsdmZone.type, zoneId, queueHsmEvent, bsdm);
          break;
        }
        default: {
          zoneHSM = new MediaZoneHSM(zoneId + '-' + bsdmZone.type, zoneId, queueHsmEvent, bsdm);
          break;
        }
      }
      zoneHSMs.push(zoneHSM);
      _hsmList.push(zoneHSM);
    });

    const promises: any[] = [];

    zoneHSMs.forEach((zoneHSM: ZoneHSM) => {
      zoneHSM.constructorFunction();
      const action = zoneHSM.hsmInitialize().bind(zoneHSM);
      promises.push(dispatch(action));
    });

    Promise.all(promises).then(() => {
      const hsmInitializationComplete = hsmInitialized();
      if (hsmInitializationComplete) {
        const event: ArEventType = {
          EventType: 'NOP',
        };
        dispatch(queueHsmEvent(event));
      }
    });
  };
}


// LWS Handlers

function getFilesToPublishResponse(filesInPublish: FileToPublish[]): any {

  const filesToPublish: FilesToPublishMap = getFilesToPublish(filesInPublish);

  const resp: any = {};
  resp.family = 'malibu';
  resp.model = 'xt1144';
  resp.fwVersion = '8.0.69.2';
  resp.fwVersionNumber = '1776';

  resp.file = [];

  for (const fileName in filesToPublish) {
    if (filesToPublish.hasOwnProperty(fileName)) {
      const fileToPublish: FileToPublish = filesToPublish[fileName];
      const file: any = {
        fileName: fileToPublish.fileName,
        filePath: fileToPublish.filePath,
        hash: fileToPublish.hash,
        size: fileToPublish.size
      };
      resp.file.push(file);
    }
  }
  return resp;
}

function getFilesToPublish(filesToPublish: FileToPublish[]): FilesToPublishMap {

  // files that need to be copied by BrightAuthor
  const actualPublishFiles: FilesToPublishMap = {};

  // files that can be deleted to make room for more content
  const deletionCandidates = {};

  const currentPoolFiles: ContentFileMap = getContentFiles();
  for (const currentPoolFile in currentPoolFiles) {
    if (currentPoolFiles.hasOwnProperty(currentPoolFile)) {
      deletionCandidates[currentPoolFile] = currentPoolFiles[currentPoolFile];
    }
  }

  for (const fileToPublish of filesToPublish) {
    if (!deletionCandidates.hasOwnProperty(fileToPublish.poolFileName)) {
      actualPublishFiles[fileToPublish.fileName] = fileToPublish;
    }
  }

  return actualPublishFiles;
}

function getContentFiles(): ContentFileMap {

  const allFiles: ContentFileMap = {};

  const poolDirectoryPath = getPoolDirectory();

  const firstLevelPoolDirectories: string[] = fs.readdirSync(poolDirectoryPath);

  for (const firstLevelPoolDirectory of firstLevelPoolDirectories) {
    const firstLevelPoolDirectoryPath = isomorphicPath.join(poolDirectoryPath, firstLevelPoolDirectory);
    const secondLevelPoolDirectories: string[] = fs.readdirSync(firstLevelPoolDirectoryPath);
    for (const secondLevelPoolDirectory of secondLevelPoolDirectories) {
      const secondLevelPoolDirectoryPath = isomorphicPath.join(firstLevelPoolDirectoryPath, secondLevelPoolDirectory);
      const filesInDirectory: string[] = fs.readdirSync(secondLevelPoolDirectoryPath);
      for (const fileInDirectory of filesInDirectory) {
        allFiles[fileInDirectory] = secondLevelPoolDirectoryPath;
      }
    }
  }

  return allFiles;
}

// LFN
// endpoints
/*
const deviceStatusApiPath = '/v2/device/status';
POST: const snapshotConfigurationApiPath = '/v2/snapshot/configuration';
const snapshotHistoryApiPath = '/v2/snapshot/history';
const snapshotApiPath = '/v2/snapshot';
-1: GET:  const deviceConfigurationApiPath = '/v2/device/configuration';
0:  POST: const storageConfigurationApiPath = '/v2/storage/configuration';
1:  POST: const publishApiPath = '/v2/publish';
1.5 POST: const publishFileApiPath = '/v2/publish/file';
2:  POST: const publishSyncApiPath = '/v2/publish/sync';
*/


function handleStatus(req: any, res: any) {
  res.send('status');
}

// first request from autorun.
function handleConfiguration(req: any, res: any) {

  const respBody = {
    model: 'XT1144',
    family: 'malibu',
    unitName: 'fred',
    contentPort: '8008'
  };

  res.json(respBody);
}

function handleStorageConfiguration(req: any, res: any) {
  const limitStorageEnabled: boolean = req.body.limitStorageEnabled;
  res.status(200).end();
}

// PostPrepareForTransferJson
// '/v2/publish'
function handlePublish(req: any, res: any) {

  const buffer: any = req.files[0].buffer;
  const fileSpecs: FileToPublish[] = JSON.parse(buffer).file;

  const response: any = getFilesToPublishResponse(fileSpecs);
  res.json(response);
}

// PostFileJson
// /v2/publish/file
function handlePublishFile(req: any, res: any) {

  const fileToTransfer: any = req.files[0];
  const { destination, encoding, fieldname, filename, mimetype, originalname, path, size } = fileToTransfer;
  const sha1FileName = req.headers['destination-filename'];

  const sourcePath: string = isomorphicPath.join(getRootDirectory(), 'lfnTransfers') + '/' + filename;

  const poolDirectory = getPoolDirectory();
  const fileNameLength = sha1FileName.length;
  const firstDir: string = sha1FileName.substring(fileNameLength - 2, fileNameLength - 1);
  const secondDir: string = sha1FileName.substring(fileNameLength - 1, fileNameLength);
  const destinationDirectory = isomorphicPath.join(poolDirectory, firstDir, secondDir);
  fs.ensureDirSync(destinationDirectory);
  const destinationPath = destinationDirectory + '/' + sha1FileName.substring(5);

  fs.renameSync(sourcePath, destinationPath);

  res.status(200).end();
}

// PostSyncSpecJson
// /v2/publish/sync
function handlePublishSync(req: any, res: any) {

  console.log('------------------------------------------------------------------- handlePublishSync');
  // const xferFile: any = req.files[0];
  // const { destination, encoding, fieldname, filename, mimetype, originalname, path, size } = xferFile;
  // const newSyncFileName = req.headers['destination-filename'];
  // const newSyncSpecPath: string = isomorphicPath.join(getRootDirectory(), 'syncSpec') + '/' + newSyncFileName;
  const newSyncSpecPath = req.files[0].path;
  const newSyncSpecBuffer: Buffer = fs.readFileSync(newSyncSpecPath);
  const newSyncSpecStr = newSyncSpecBuffer.toString();
  const newSyncSpec: SyncSpec = JSON.parse(newSyncSpecStr) as SyncSpec;
  console.log(newSyncSpec);

  const oldSyncFileName = 'local-sync.json';
  const oldSyncSpecPath = isomorphicPath.join(getRootDirectory(), oldSyncFileName);
  const oldSyncSpecBuffer: Buffer = fs.readFileSync(oldSyncSpecPath);
  const oldSyncSpecStr = oldSyncSpecBuffer.toString();
  const oldSyncSpec: any = JSON.parse(oldSyncSpecStr);
  console.log(oldSyncSpec);

  const oldSyncSpecScriptsOnly: SyncSpecDownload[] = [];
  const oldSyncSpecFiles: SyncSpecFiles = newSyncSpec.files;
  const oldSyncSpecDownloadFiles: SyncSpecDownload[] = oldSyncSpecFiles.download;
  for (const syncSpecDownload of oldSyncSpecDownloadFiles) {
    if (!isNil(syncSpecDownload.group) && syncSpecDownload.group === 'script') {
      oldSyncSpecScriptsOnly.push(syncSpecDownload);
    }
  }

  const newSyncSpecScriptsOnly: SyncSpecDownload[] = [];
  const newSyncSpecFiles: SyncSpecFiles = newSyncSpec.files;
  const newSyncSpecDownloadFiles: SyncSpecDownload[] = newSyncSpecFiles.download;
  for (const syncSpecDownload of newSyncSpecDownloadFiles) {
    if (!isNil(syncSpecDownload.group) && syncSpecDownload.group === 'script') {
      newSyncSpecScriptsOnly.push(syncSpecDownload);
    }
  }

  fs.writeFileSync(oldSyncSpecPath, newSyncSpecStr);

  res.send('handlePublishSync');
}




