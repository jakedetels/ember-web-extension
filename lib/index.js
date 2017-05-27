/* eslint-env node */
'use strict';

// const writeFile = require('broccoli-file-creator');
const stew = require('broccoli-stew');
const mergeTrees = require('broccoli-merge-trees');

const Manifest = require('./manifest');

module.exports = {
  // init() {
  //   this._super.init.apply(this, arguments);
  //   console.log(arguments);
  // },

  // included: function() {
  //   this.addonPath = this.app.options['myaddon']['directory'] || 'app';
  // },

  getTreeForPublic: function() {
    const publicTree = this._super.treeForPublic.apply(this, arguments);
    const trees = [];
    if (publicTree) {
      trees.push(publicTree);
    }
    


    

    trees.push(Manifest.createTree());

    return mergeTrees(trees);
  },

  name: 'ember-web-extension',

  config(env, baseConfig) {

    let configs = baseConfig.emberWebExtension || {};

    this.configs = configs;

    return baseConfig;
  },

  treeFor(type) {
    console.log('treeFor type: ' + type);
    if (type === 'public') {
      return this.getTreeForPublic();
    }
  },

  // getTreeForApp() {
  //   console.log('this is treeForApp');
  //   // debugger;
  //   let configs = JSON.stringify(this.configs, null, 2);
  //   return writeFile('/app/manifest.json', configs);
  // },
  contentFor: function(type, config) {
    if (type === 'environment') {
      return `<script>var context = 'options-page';</script>`;
    }
  },

  // preprocessTree(type, tree) {
  //   console.log('preprocess tree type: ' + type);

  //   if (type === 'all') {
  //     // let configs = JSON.stringify(this.configs, null, 2);
  //     // let manifest = writeFile('/manifest.json', configs);
  //     let manifest = writeFile('/app/manifest2.json', new Manifest(this.configs));
  //     tree = mergeTrees([tree, manifest]);
  //   }

  //   return tree;
  // },

  // postprocessTree(type, tree) {
  //   console.log('postprocess tree type: ' + type);

  //   if (type === 'all') {
  //     // let configs = JSON.stringify(this.configs, null, 2);
  //     // let manifest = writeFile('/manifest.json', configs);
  //     let manifest = writeFile('/manifest1.json', new Manifest(this.configs));
  //     tree = mergeTrees([tree, manifest]);
  //   }

  //   tree = stew.debug(tree, type);

  //   return tree;
  // },

  // preBuild(build) {
  //   debugger;
  // },

  // postBuild(build) {
  //   console.log('build directory: ' + build.directory);
  // }
};
