/* eslint-env node */
'use strict';

const Funnel = require('broccoli-funnel');
const metal = require('broccoli-metal');
// const writeFile = require('broccoli-file-creator');
const stew = require('broccoli-stew');
const mergeTrees = require('broccoli-merge-trees');

let count = 0;

module.exports = {
  name: 'ember-web-extension',

  init() {
    this._super.apply(this, ...arguments);
    console.log('ember-web-extension/lib/index#init()');
    debugger;
  },

  config(environment, config) {
    return config;
  },

  treeFor(name) {
    let tree = this._super.apply(this, ...arguments);
    tree = stew.debug(tree, ++count + '-tree-for-' + name);

    return tree;
  },

  preProcessedTrees: {},

  preprocessTree(type, tree) {
    this.preProcessedTrees[type] = tree;

    tree = stew.debug(tree, `${++count}-pre-process-tree--${type}`);

    return tree;
  },

  postprocessTree(type, tree) {
    tree = stew.debug(tree, `${++count}-post-process-tree--${type}`);

    if (type === 'all') {
      tree = this.getFinalTree(tree);
    }

    return tree;
  },

  getFinalTree(tree) {
    let htmlTree = new Funnel(tree, {
      include: ['index.html']
    });

    const jsTree = this.preProcessedTrees.js;

    let browserActionTree = new Funnel(jsTree, {
      srcDir: '',
      include: ['browser-action/template.hbs']
    });

    browserActionTree = new metal(mergeTrees([htmlTree, browserActionTree]), files => {
      let newFiles = {};
      let html = files['index.html'];

      if (files.hasOwnProperty('browser-action/template.hbs')) {
        let customJs = `require('ember-web-extension')`;
        let customHtml = `<script>${customJs}</script>\n</body>`;
        newFiles['browser-action/popup.html'] = html.replace(/<\/body>/, customHtml)
      }

      return newFiles;
    });

    return mergeTrees([tree, browserActionTree]);
  }
};
