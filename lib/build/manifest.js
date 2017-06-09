const Funnel      = require('broccoli-funnel');
const metal       = require('broccoli-metal');
const mergeTrees  = require('broccoli-merge-trees');
const fs          = require('fs-extra');
const glob        = require('glob');

const path        = require('path');

module.exports = Manifest;

function Manifest(projectDir) {
  this.projectDir = projectDir;
  this.appDir = path.join(this.projectDir, 'app');
  this.pkg = require(path.join(this.projectDir, 'package.json'));
  this.contentScripts = {};
  this.appFiles = new Set(glob.sync('**/*.@(js|hbs|json|css|png|jpg|gif)', {
    cwd: this.appDir
  }));

  this.validateContentScripts();

  const contentSciptStyles = new Funnel(path.join(this.appDir), {
    include: Object.keys(this.contentScripts).map(filePath => {
      const cs = this.contentScripts[filePath];
      return `${cs.base}/styles.css`;
    }),
    destDir: 'content-scripts'
  });

  this.browserActionManifest = this.getBrowserActionManifest();

  const browserActionTree = new Funnel(this.appDir, {
    include: ['browser-action/browser-action.json']
  });

  const trees = [
    browserActionTree,
    contentSciptStyles,
    this.getAppTree(),
    this.getEnvironmentTree(),
    this.getContentScriptManifests()
  ].filter(tree => tree);

  let tree = mergeTrees(trees);

  this.tree = new metal(tree, this.generateOutput.bind(this));
}

const fn = Manifest.prototype;

Manifest.create = function(projectDir) {
  const manifest = new Manifest(projectDir);
  return manifest.getTree();
};

fn.generateOutput = function(inputFiles) {
  let appManifest = {};
  
  try {
    let json = inputFiles['manifest.json'];
    appManifest = JSON.parse(json);
  } catch(e) {} // eslint-disable-line

  const envConfig = this.getEnvConfig();
  const manifest = Object.assign(appManifest, envConfig);
  const outputFiles = {};
  const contentScriptManifests = this.parseContentScripts(inputFiles);

  if (contentScriptManifests.length) {
    manifest.content_scripts = contentScriptManifests;
  }

  Object.keys(this.contentScripts).forEach(filePath => {
    const cs = this.contentScripts[filePath];
    if (cs.hasJs) {
      const bootFilePath = `content-scripts/${cs.base}/${cs.base}.js`;
      const { pkg } = this;
      let bootJs = `require('ember-web-extension/content-script').create({route: '${cs.base}', app: {name: '${pkg.name}', version: '${pkg.version}'}})`;
      outputFiles[bootFilePath] = bootJs;
    }
    if (cs.hasStyles) {
      const stylesPath = `content-scripts/${cs.base}/${cs.base}.css`;
      outputFiles[stylesPath] = inputFiles[`content-scripts/${cs.base}/styles.css`];
    }
  });

  let browserActionManifest = this.browserActionManifest;
  let userBrowserActionManifest = inputFiles['browser-action/browser-action.json'];

  if (userBrowserActionManifest) {
    userBrowserActionManifest = JSON.parse(userBrowserActionManifest);
    browserActionManifest = Object.assign({}, browserActionManifest, userBrowserActionManifest);
  }

  manifest.browser_action = browserActionManifest;

  outputFiles['manifest.json'] = JSON.stringify(manifest, null, 2)

  return outputFiles;
};

fn.getTree = function() {
  return this.tree;
};

fn.getEnvConfig = function() {
  const envConfigPath = path.join(this.projectDir, 'config/environment.js');

  try {
    delete require.cache[envConfigPath];
    
    const configsFn = require(envConfigPath);

    const configs = configsFn('test');

    return configs.emberWebExtension || {};

  } catch(e) {
    return {};
  }
};

fn.getAppTree = function() {
  const tree = new Funnel(path.join(this.projectDir, 'app'), {
    include: ['**/manifest.json']
  });

  return tree;
};

fn.getEnvironmentTree = function() {
  const configPath = path.join(this.projectDir, 'config');
  const envPath = path.join(configPath, 'environment.js');

  if (! fs.existsSync(envPath)) return;

  const tree = new Funnel(configPath, {
    include: ['environment.js']
  });

  return tree;
};

fn.validateContentScripts = function() {

  const rootCSPath = path.join(this.appDir, 'content-script.json');

  if (fs.existsSync(rootCSPath)) {
    throw new Error('content-script.json files cannot be declared within your app root');
  }

  this.appFiles.forEach(filePath => {
    if (! filePath.match('content-script.json')) return;

    const base = filePath.replace('/content-script.json', '');
    const route = `${base}/route.js`;
    const controller = `${base}/controller.js`;
    const template = `${base}/template.hbs`;
    const css = `${base}/styles.css`;

    const hasStyles = this.appFiles.has(css);
    const hasJs = (
          this.appFiles.has(route)
      ||  this.appFiles.has(controller)
      ||  this.appFiles.has(template)
    );

    const hasDependencies = hasJs || hasStyles;

    if (! hasDependencies) {
      throw new Error(`The content script at ${filePath} must define a route.js, controller.js, and/or template.hbs`);
    }

    this.contentScripts[filePath] = {base, hasJs, hasStyles};
  });
};

fn.getContentScriptManifests = function() {
  return new Funnel(this.appDir, {
    include: ['*/content-script.json']
  });
};

fn.parseContentScripts = function(files) {
  return Object.keys(files)
    .filter(filePath => filePath.endsWith('/content-script.json'))
    .map(filePath => {
      const json = files[filePath];
      const entry = JSON.parse(json);
      const podConfigs = this.contentScripts[filePath];
      const { base, hasJs, hasStyles } = podConfigs;

      if (! Array.isArray(entry.matches) || entry.matches.length === 0) {
        throw new Error(`${filePath} must define a matches array with at least one match pattern`);
      }

      if (hasJs) {
        const bootJs = `content-scripts/${base}.js`;
        entry.js = [`assets/${this.pkg.name}.js`, bootJs];
      }

      if (hasStyles) {
        entry.css = [`content-scripts/${base}/${base}.css`];
      }

      return entry;
    });
};

fn.getBrowserActionManifest = function() {
  let browserAction = {};
  if (this.appFiles.has('browser-action/template.hbs')) {
    browserAction.default_popup = 'browser-action/popup.html';
  }

  if (this.appFiles.has('browser-action/icon.png')) {
    browserAction.default_icon = 'browser-action/icon.png';
  }

  if (Object.keys(browserAction).length) {
    return browserAction;
  }
};