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
  console.log('send configuration');

  const respBody = {
    model: 'XT1144',
    family: 'malibu',
    unitName: 'fred',
    contentPort: '8008'
  };

  res.json(respBody);
}

function handleStorageConfiguration(req: any, res: any) {
  console.log(req.body);
  const limitStorageEnabled: boolean = req.body.limitStorageEnabled;
  console.log('limitStorageEnabled: ' + limitStorageEnabled);
  res.status(200).end();
}

function handlePublish(req: any, res: any) {
  res.send('handlePublish');
  console.log(req.body);
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

// app.use(express.urlencoded({ extended: false }));
// app.use(express.urlencoded());
// app.use(express.json());

const port = 8080;

app.get('/', (req: any, res: any) => res.send('Hello World!'));
app.get('/v2/device/configuration', (req: any, res: any) => handleConfiguration(req, res));
app.get('/v2/device/status', (req: any, res: any) => handleStatus(req, res));
// app.post('/v2/storage/configuration',  (req: any, res: any) => handleStorageConfiguration(req, res));
app.post('/v2/storage/configuration', upload.none(), (req: any, res: any, next: any) => handleStorageConfiguration(req, res));

app.post('/v2/publish',  (req: any, res: any) => handlePublish(req, res));
app.post('/v2/publish/sync',  (req: any, res: any) => handlePublishSync(req, res));


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