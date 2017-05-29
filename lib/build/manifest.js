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
  this.contentScripts = {};
  this.appFiles = glob.sync('**/*.@(js|hbs|json|css)', {
    cwd: this.appDir
  });//.map(path => path.replace(/\//g, '\\'));

  this.validateContentScripts();

  const trees = [
    this.getAppTree(),
    this.getEnvironmentTree(),
    this.getContentScriptManifests()
  ].filter(tree => tree);

  let tree = mergeTrees(trees);

  this.tree = new metal(tree, files => {
    const newFiles = {};
    const envConfig = this.getEnvConfig();
    const contentScriptManifests = this.parseContentScripts(files);

    let appManifest = {};
    
    try {
      let json = files['manifest.json'];
      appManifest = JSON.parse(json);
    } catch(e) {} // eslint-disable-line

    const manifest = Object.assign(appManifest, envConfig);

    Object.keys(this.contentScripts).forEach(filePath => {
      const cs = this.contentScripts[filePath];
      if (cs.hasJs) {
        const bootFilePath = `content-scripts/${cs.base}.js`;
        const pkg = require(path.join(this.projectDir, 'package.json'));
        let bootJs = `var context = '${cs.base}';`;
        
        bootJs += `require('${pkg.name}/app').create({name: '${pkg.name}', version: '${pkg.version}'});`;
        
        newFiles[bootFilePath] = bootJs;
      }
    });

    if (contentScriptManifests.length) {
      manifest.content_scripts = contentScriptManifests;
    }

    newFiles['manifest.json'] = JSON.stringify(manifest, null, 2)

    return newFiles;
  });
}

const fn = Manifest.prototype;

Manifest.create = function(projectDir) {
  const manifest = new Manifest(projectDir);
  return manifest.getTree();
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
    // const route = path.join(base, 'route.js');
    // const controller = path.join(base, 'controller.js');
    // const template = path.join(base, 'template.hbs');
    // const css = path.join(base, 'styles.css');
    const hasJs = (
          this.appFiles.indexOf(route) > -1
      ||  this.appFiles.indexOf(controller) > -1
      ||  this.appFiles.indexOf(template) > -1
    );

    const hasStyles = this.appFiles.indexOf(css) > -1;
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
      const { hasJs, base } = podConfigs;

      if (hasJs) {
        const bootJs = `content-scripts/${base}.js`;
        entry.js = [bootJs];
      }

      return entry;
    });
};