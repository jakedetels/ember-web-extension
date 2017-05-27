/* eslint-env node */
'use strict';

const writeFile = require('broccoli-file-creator');
const Funnel = require('broccoli-funnel');
const path = require('path');

module.exports = Manifest;

let uiRoutes = [
  // 'browser-action',
  // 'page-action',
  // 'sidebar',
  // 'options-ui',
  // 'devtools-page',
  'x-ray',
  'native',
  'iframe'
];

let globMap = {};

uiRoutes.forEach(route => {

});

function globMapMaker() {

}

const manifestMap = {
  'browser_action.default_icon': {
    files: ['browser-action/icon.{png,gif,jpg}'],
    value: files => files[0]
  },
  'browser_action.default_icon.16': {
    files: ['browser-action/icon-16.{png,gif,jpg}'],
    value: files => files[0]
  },
  'browser_action.default_icon.19': {
    files: ['browser-action/icon-19.{png,gif,jpg}'],
    value: files => files[0]
  },
  'browser_action.default_icon.32': {
    files: ['browser-action/icon-32.{png,gif,jpg}'],
    value: files => files[0]
  },
  'browser_action.default_icon.38': {
    files: ['browser-action/icon-38.{png,gif,jpg}'],
    value: files => files[0]
  },
  'browser_action.default_icon.64': {
    files: ['browser-action/icon-64.{png,gif,jpg}'],
    value: files => files[0]
  },
  'browser_action.default_popup': {
    files: [
      'browser-action/template.hbs',
      'browser-action/route.js',
      'browser-action/controller.js',
      'browser-action/index.html'
    ],
    value: 'browser-action/index.html'
  },
  'background.page': {
    files: [
      'background.js',
      'background/index.js',
      'background.html',
      'background/index.html'
    ],
    value: ['background/index.html']
  },
  'icons.48': {
    files: ['icon-48.{png,gif,jpg}'],
    value: files => files[0]
  },
  'icons.96': {
    files: ['icon-96.{png,gif,jpg}'],
    value: files => files[0]
  },
  'page_action.default_icon': {
    files: ['page-action/icon.{png,gif,jpg}'],
    value: files => files[0]
  },
  'page_action.default_icon.16': {
    files: ['page-action/icon-16.{png,gif,jpg}'],
    value: files => files[0]
  },
  'page_action.default_icon.19': {
    files: ['page-action/icon-19.{png,gif,jpg}'],
    value: files => files[0]
  },
  'page_action.default_icon.32': {
    files: ['page-action/icon-32.{png,gif,jpg}'],
    value: files => files[0]
  },
  'page_action.default_icon.38': {
    files: ['page-action/icon-38.{png,gif,jpg}'],
    value: files => files[0]
  },
  'page_action.default_icon.64': {
    files: ['page-action/icon-64.{png,gif,jpg}'],
    value: files => files[0]
  },
  'page_action.default_popup': {
    files: [
      'page-action/template.hbs',
      'page-action/route.js',
      'page-action/controller.js',
      'page-action/index.html'
    ],
    value: 'page-action/index.html'
  },
  'devtools_page': {
    files: [
      'devtools/template.hbs',
      'devtools/route.js',
      'devtools/controller.js',
      'devtools/index.html'
    ],
    value: 'devtools/index.html'
  },
  'options_ui.page': {
    files: [
      'options-ui/template.hbs',
      'options-ui/route.js',
      'options-ui/controller.js',
      'options-ui/index.html'
    ],
    value: 'options-ui/index.html'
  },
  'sidebar_action.default_icon': {
    files: ['sidebar-action/icon.{png,gif,jpg}'],
    value: files => files[0]
  },
  'sidebar_action.default_icon.16': {
    files: ['sidebar-action/icon-16.{png,gif,jpg}'],
    value: files => files[0]
  },
  'sidebar_action.default_icon.19': {
    files: ['sidebar-action/icon-19.{png,gif,jpg}'],
    value: files => files[0]
  },
  'sidebar_action.default_icon.32': {
    files: ['sidebar-action/icon-32.{png,gif,jpg}'],
    value: files => files[0]
  },
  'sidebar_action.default_icon.38': {
    files: ['sidebar-action/icon-38.{png,gif,jpg}'],
    value: files => files[0]
  },
  'sidebar_action.default_icon.64': {
    files: ['sidebar-action/icon-64.{png,gif,jpg}'],
    value: files => files[0]
  },
  'sidebar_action.default_popup': {
    files: [
      'sidebar-action/template.hbs',
      'sidebar-action/route.js',
      'sidebar-action/controller.js',
      'sidebar-action/index.html'
    ],
    value: 'sidebar-action/index.html'
  },
  'content_scripts[]': {
    files: [
      '**/content-script.json'
    ],
    value: files => files.map(file => {
      const {filePath, contents} = file;
      const manifest = JSON.parse(contents);
      // const js = filePath.replace('content-script.json', '');
      const js = 'assets/app.js';

      /**
       * broccoli-funnel
       * broccoli-stew.map
       * broccoli-metal
       */
    })
  }
};

const metal = require('broccoli-metal');

function getContentScriptsTree(appRoot) {
  const manifestJsonEntriesTree = new Funnel(appRoot, {
    include: ['content-scripts/**/content-script.json']
  });

  return metal(manifestJsonEntriesTree, files => {
    const tree = {};
    const entries = [];

    Object.keys(files).forEach(filePath => {
      const contents = files[filePath];
      const entry = JSON.parse(contents);
      const bootJsPath = filePath.replace('.json', '.js');
      const routeName = filePath.replace('/content-script.json', '');
      
      tree[bootJsPath] = `var context = '${routeName}';`;
      
      entry.js = [bootJsPath];

      entries.push(entry);
    });

    tree['manifest.json'] = JSON.stringify({content_scripts: entries}, null, 2);

    return tree;
  });

}

function Manifest(configs) {
  this.configs = configs;
}

Manifest.createTree = function() {
  let appRoot = path.join(__dirname, '../tests/dummy/app');

  let appManifest = new Funnel(appRoot, {
    include: ['manifest.json']
  });

  let browserActionFiles = [

  ];

  new hmm = new Funnel(appRoot, {
    include: [
      // Browser Action Files:
        'browser-action/template.hbs',
        'browser-action/controller.js',
        'browser-action/route.js',
        'templates/browser-action.js'
    ]
  });

  let environmentManifest;

  let blankManifest = writeFile('/manifest3.json', new Manifest(this.configs));

  let manifestTree = mergeTrees([blankManifest, appManifest], {overwrite: true});

  userManifest = stew.map(appManifest, (contents, relativePath) => {
    try {
      contents = JSON.parse(contents);
    } catch(e) {
      contents = {};
    }

    Object.assign(this.configs, contents);

    return JSON.stringify(this.configs, null, 2);
  });

  return manifestTree;
};

Manifest.prototype.toString = function() {
  return JSON.stringify(this.configs, null, 2);
};