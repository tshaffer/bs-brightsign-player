import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import { Provider } from 'react-redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import {
  bsDmReducer,
} from '@brightsign/bsdatamodel';

import { BsBrightSignPlayerState } from '../src/type';
import { Template, bsBspReducer } from '../src/index';
import './bootstrap.css';
import 'normalize.css/normalize.css';
import 'flexboxgrid/dist/flexboxgrid.min.css';
import 'font-awesome/css/font-awesome.min.css';

const getStore = () => {
  const reducers = combineReducers<BsBrightSignPlayerState>({
    bsdm: bsDmReducer,
    bsp: bsBspReducer,
  });
  return createStore<BsBrightSignPlayerState>(
    reducers,
    composeWithDevTools(applyMiddleware(thunk),
  ));
};

const store = getStore();

ReactDOM.render(
  <Provider store={store}>
    <Template />
  </Provider>,
  document.getElementById('root') as HTMLElement
);
