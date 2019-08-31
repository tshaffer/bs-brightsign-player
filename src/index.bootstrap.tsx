import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { Provider } from 'react-redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import './asset/bootstrap.css';
import 'normalize.css/normalize.css';
import 'flexboxgrid/dist/flexboxgrid.min.css';
import 'font-awesome/css/font-awesome.min.css';
import { App, bsBrightSignPlayerReducer, BsBrightSignPlayerState } from './index';
import { initRuntime } from './controller';
import { combineReducers } from 'redux';
import { bsDmReducer } from '@brightsign/bsdatamodel';
// import express from 'express';

console.log('define getStore');

const getStore = () => {
  const reducers = combineReducers<BsBrightSignPlayerState>({
    bsdm: bsDmReducer,
    bsPlayer: bsBrightSignPlayerReducer,
  });
  return createStore<BsBrightSignPlayerState>(
    reducers,
    composeWithDevTools(applyMiddleware(thunk),
    ));
};

function bootstrapper() {

  console.log('bootstrapper');

  const store = getStore();

  store.dispatch(initRuntime(store));

  ReactDOM.render(
    <Provider store={store}>
      <App />
    </Provider>,
    document.getElementById('root') as HTMLElement
  );

}

function handleStatus(req: any, res: any) {
  console.log('send status');
  res.send('status');
}

// first request from autorun.
function handleConfiguration(req: any, res: any) {
  console.log('---------------------------------------------- send configuration');

  const respBody = {
    model: 'XT1144',
    family: 'malibu',
    unitName: 'fred',
    contentPort: '8008'
  };

  res.json(respBody);
}

function handleStorageConfiguration(req: any, res: any) {
  console.log('---------------------------------------------- handleStorageConfiguration');
  const limitStorageEnabled: boolean = req.body.limitStorageEnabled;
  console.log('---------------------------------------------- limitStorageEnabled: ' + limitStorageEnabled);
  res.status(200).end();
}

function handlePublish(req: any, res: any) {
  console.log('---------------------------------------------- handlePublish');
  console.log(req.files);

  // file was uploaded to
  //    uploads/04a91bb38505b68ed9141ca9f229f48e
  //    could read it and do a JSON.parse on it.

  const buffer: any = req.files[0].buffer;
  const fileSpecs: any[] = JSON.parse(buffer).file;

  for (const fileSpec of fileSpecs) {
    console.log(fileSpec);
  }

  res.status(200).end();
}

function handlePublishSync(req: any, res: any) {
  res.send('handlePublishSync');
}

// const app: express.Application = express();
// console.log(app);
const express = require('express');
const app = express();
const multer  = require('multer');
const upload = multer();
// const uploadManifest = multer({ dest: 'uploads/' })
const uploadManifest = multer()

const port = 8080;

app.get('/', (req: any, res: any) => res.send('Hello World!'));
app.get('/v2/device/status', (req: any, res: any) => handleStatus(req, res));

app.get('/v2/device/configuration', (req: any, res: any) => handleConfiguration(req, res));
app.post('/v2/storage/configuration', upload.none(), (req: any, res: any, next: any) => handleStorageConfiguration(req, res));

// app.post('/v2/publish',  (req: any, res: any) => handlePublish(req, res));
// app.post('/v2/publish',  (req: any, res: any) => handlePublish(req, res));
// app.post('/v2/publish', upload.any(), (req: any, res: any) => handlePublish(req, res));
// app.post('/v2/publish', uploadManifest.single('filesToPublish.json'), (req: any, res: any) => handlePublish(req, res));
app.post('/v2/publish', uploadManifest.any(), (req: any, res: any) => handlePublish(req, res));

// app.post('/v2/publish/sync',  (req: any, res: any) => handlePublishSync(req, res));


app.listen(port, () => console.log(`Example app listening on port ${port}!`));

console.log('setTimeout');

// setTimeout(bootstrapper, 30000);
setTimeout(bootstrapper, 1000);

// endpoints
/*
-1: const deviceConfigurationApiPath = '/v2/device/configuration';
const deviceStatusApiPath = '/v2/device/status';
POST: const snapshotConfigurationApiPath = '/v2/snapshot/configuration';
const snapshotHistoryApiPath = '/v2/snapshot/history';
const snapshotApiPath = '/v2/snapshot';
0: POST: const storageConfigurationApiPath = '/v2/storage/configuration';
1: POST: const publishApiPath = '/v2/publish';
POST: const publishFileApiPath = '/v2/publish/file';
2: POST: const publishSyncApiPath = '/v2/publish/sync';
*/

/*
var path = require('path');
var express = require('express');
var app = express();
var multer  = require('multer');

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + file.originalname);
  }
});

var upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));

app.post('/upload', upload.single('wallpaper'), function (req, res) {
  var imagePath = req.file.path.replace(/^public\//, '');
  res.redirect(imagePath);
});

app.use(function (err, req, res, next) {
  if (err instanceof multer.MulterError) res.status(500).send(err.message);
  else next(err);
});

app.listen(5000);
*/