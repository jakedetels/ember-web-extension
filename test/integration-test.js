const fs = require('fs-extra');
const glob = require('glob');
const chai = require('chai');
const path = require('path');

const {expect, assert} = chai;

const tmpDir = path.join(__dirname, '../tmp-test');

describe.only('full build', function() {
  before(function() {
    fs.emptyDirSync(tmpDir);
    // return ensureEmberNodeModules();
  });

  it('creates a dist/browser-action/popup.html file for app/browser-action/template.hbs', function() {
    return buildComplete('browser-action-popup').then(files => {
      assert(files.has('browser-action/popup.html'));
    });
  });


});

let i = 0;

function buildComplete(fixtureName) {
  const appName = `em-${++i}`;
  const appDir = path.join(tmpDir, appName);
  const options = {cwd: tmpDir};
  const fixtureDir = path.join(__dirname, 'fixtures', fixtureName);

  fs.ensureDirSync(tmpDir);

  return exec(`ember new ${appName} --skip-npm --skip-git --skip-bower`, options)
    .then(() => {
      const pkgPath = path.join(appDir, 'package.json');
      const pkg = fs.readJsonSync(pkgPath);

      delete pkg.devDependencies['ember-cli-app-version'];
      delete pkg.devDependencies['ember-welcome-page'];
      delete pkg.devDependencies['ember-data'];
      
      pkg.devDependencies['ember-web-extension'] = '^0.0.0'

      fs.writeJSONSync(pkgPath, pkg);

      fs.copySync(path.join(__dirname, 'fixtures/ember-cli-build.js'), path.join(appDir, 'ember-cli-build.js'));
      // fs.ensureSymlinkSync('..', path.join(appDir, 'node_modules/ember-web-extension'));
      fs.ensureSymlinkSync(path.join(__dirname, '../node_modules'), path.join(appDir, 'node_modules'));
      const emberWebExtensionRoot = path.join(__dirname, '..');
      const emberWebExtensionSymlink = path.join(__dirname, '../node_modules/ember-web-extension');
      fs.ensureSymlinkSync(emberWebExtensionRoot, emberWebExtensionSymlink);
      fs.removeSync(path.join(appDir, 'app'));

      fs.ensureSymlinkSync(path.join(fixtureDir, 'app'), path.join(appDir, 'app'));

      return exec('ember build -dev', {cwd: appDir}).then(() => {
        return new Set(glob.sync('**/*', {
          cwd: path.join(appDir, 'dist')
        }));
      });

    });
}

      // return spawn('ember' ['build', '-dev'], {cwd: appDir}).then(() => {
      //   return new Set(glob.sync('**/*', {
      //     cwd: path.join(appDir, 'dist')
      //   }));
      // });

function exec(command, options = {}) {
  return new Promise((resolve, reject) => {
    require('child_process').exec(command, options, function(err, stdout, stderr) {
      err ? reject(err) : resolve(stdout);
    });
  });
}

function spawn(command, args = [], options = {}) {
  const spawn = require('child_process').spawn;
  // const ps = spawn('ps', ['ax']);
  
  return new Promise((resolve, reject) => {
    const ps = spawn(command, args, options);
    // const grep = spawn('grep', ['ssh']);

    ps.stdout.on('data', (data) => {
      console.log('spwaned stdout: ', data.toString());
    });

    ps.stderr.on('data', (data) => {
      console.log(`spawned stderr: ${data}`);
    });

    ps.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.log(`ps process exited with code ${code}`);
        reject(code);
      }
    });
  });
}