const broccoli        = require('ember-cli-broccoli');
const chai            = require('chai');
const chaiAsPromised  = require('chai-as-promised');
const fs              = require('fs-extra');
const stew            = require('broccoli-stew');
const Funnel          = require('broccoli-funnel');
const writeFile       = require('broccoli-file-creator');

const path            = require('path');

const Addon           = require('../..');
const Manifest        = require('../../lib/build/manifest');

const {expect, assert} = chai;

chai.use(chaiAsPromised);

let builder;

describe('manifest.json', function() {

  // We'll save our full kitchen sink build to use in several tests
  let ksBuild = {};

  before(function() {
    return build('kitchen-sink').then(result => {
      ksBuild.directory = result.directory;
      ksBuild.manifest = getManifest(result.directory);
    });
  });

  after(function() {
    if (builder) return builder.cleanup();
  });

  it('takes the main user defined app/manifest.json', function() {
    return build('simple').then(function(result) {
      let manifest = getManifest(result.directory);
      expect(manifest.name).to.equal('a simple app');
    });
  });

  it('merges app/manifest.json with environment configs', function() {
    const { manifest } = ksBuild;
    expect(manifest.foo).to.equal('bar');
    assert.equal(manifest.a, 'config/environment', 'config/environment should overwrite app/manifest');
  });

  describe('content scripts', function() {
    it('merges content-script.json files with the manifest', function() {
      const { manifest } = ksBuild;
      const cs = manifest.content_scripts;
      expect(cs).to.an('array');
      expect(cs[0]).to.have.property('name', 'cs-pod-1');
      expect(cs[1]).to.have.property('name', 'cs-pod-2');
    });

    it('throws an error when content-script.json is defined in the app root', function() {
      expect(function() {
        return build('error-content-script-root');
      }).to.throw('content-script.json files cannot')
    });

    it('throws an error when content-script.json is missing a router/controller/template/style sibling', function() {
      expect(function() {
        return build('error-content-script-missing-sibbling');
      }).to.throw('must define a route.js, controller.js, and/or template.hbs')
    });

    it('creates a boot js file for each content script route', function() {
      const { directory } = ksBuild;
      const boot1 = path.join(directory, 'content-scripts/cs-pod-1/cs-pod-1.js');
      const boot2 = path.join(directory, 'content-scripts/cs-pod-2/cs-pod-2.js');
      assert(fs.existsSync(boot1), 'cs-1 boot file created');
      assert(fs.existsSync(boot2), 'cs-2 boot file created');
    });
    
    it('adds the boot js file to the manifest content_script entries', function() {
      const cs = ksBuild.manifest.content_scripts;
      expect(cs[0].js).to.deep.equal(['assets/my-app.js', 'content-scripts/cs-pod-1.js']);
      expect(cs[1].js).to.deep.equal(['assets/my-app.js', 'content-scripts/cs-pod-2.js']);
    });

    it('generates the correct contents for each content script boot file', function() {
      const cs1Path = path.join(ksBuild.directory, 'content-scripts/cs-pod-1/cs-pod-1.js');
      const cs2Path = path.join(ksBuild.directory, 'content-scripts/cs-pod-2/cs-pod-2.js');

      const cs1Contents = fs.readFileSync(cs1Path).toString();
      const cs2Contents = fs.readFileSync(cs2Path).toString();
      const expected1 = `require('ember-web-extension/content-script').create({route: 'cs-pod-1', app: {name: 'my-app', version: '1.2.3'}})`;
      const expected2 = `require('ember-web-extension/content-script').create({route: 'cs-pod-2', app: {name: 'my-app', version: '1.2.3'}})`;

      assert.equal(cs1Contents, expected1);
      assert.equal(cs2Contents, expected2);
    });

    it('throws an error if the matches array is empty in the content-script.json files', function(done) {
      build('error-content-script-no-matches').catch(err => {
        expect(err.message + err.stack).to.contain('must define a matches array with at least one match pattern');
        done();
      });
    });

    it('includes content script css files at dist/content-scripts/<content-script-name>/<stylesheet-name>.css', function() {
      const cssPath = path.join(ksBuild.directory, 'content-scripts/cs-pod-1/cs-pod-1.css');
      assert(fs.existsSync(cssPath), 'content script css file exists');
    });

    it('adds content-script styles.css files to the content_scripts manifest entries', function() {
      assert.equal(ksBuild.manifest.content_scripts[0].css[0], 'content-scripts/cs-pod-1/cs-pod-1.css');
    });
    
    it('includes other css files in dist/content-scripts/<route-name>/*.css');
  });

  describe('browser-action', function() {
    it('merges browser-action/browser-action.json into manifest.json', function() {
      const { manifest } = ksBuild;
      assert.equal(manifest.browser_action.foo, 'bar')
    });

    it('creates a manifest entry for popup.html for app/browser-action/template.hbs', function() {
      assert.equal(ksBuild.manifest.browser_action.default_popup, 'browser-action/popup.html');
    });

    it.skip('creates a dist/browser-action/popup.html file for app/browser-action/template.hbs', function() {
      return outputFinalBuild('browser-action-popup').then(result => {
        const popupPath = path.join(result.directory, 'browser-action/popup.html');
        assert(fs.existsSync(popupPath), 'Output is missing browser-action/popup.html');
        let contents = fs.readFileSync(popupPath).toString();
        let expectedInsertion = `<script>require('ember-web-extension`;
        expect(contents).to.contain(expectedInsertion);
      });
    });

    it(`doesn't create a popup.html entry when there is no template.hbs or user defined popup.html`, function() {
      return outputFinalBuild('simple').then(result => {
        const popupPath = path.join(result.directory, 'browser-action/popup.html');
        assert(! fs.existsSync(popupPath), 'Output should not contain browser-action/popup.html');
      });
    });

    it.skip('full run', function() {
      const tmp = require('tmp');
      const { exec } = require('child_process');
      const primaryTmpAppDir = 'c:/www/ember-web-extension/tmp/ember-web-extension-main-test-app';
      const fs = require('fs-extra');
      fs.ensureDirSync(primaryTmpAppDir);
      // const command = 'ember new em1 --skip-npm --skip-bower --skip-git';
      const command = 'ember new em1 --skip-bower --skip-git';
      const tmpDir = tmp.dirSync({
        prefix: 'ember-web-extension-'
      })

      const options = {
        // cwd: tmpDir.name
        cwd: primaryTmpAppDir
      };

      // const appPath = path.join(tmpDir.name, 'em1');
      const appPath = path.join(primaryTmpAppDir, 'em1/node_modules');
      console.log(path.normalize(tmpDir.name));
      exec(command, options, function(err, stdout, stderr) {
        // debugger;

        if (err) {
          return console.log(stderr);
        }

        // 'tmp\ember-web-extension-tests\with-node-modules\node_modules'

        console.log(stdout);
        
        const fs = require('fs');
        // const nodeModulesPath = 'c:/www/ember-web-extension/node_modules'
        // const tmpNodeModulesPath = path.join(tmpDir.name, 'em1/node_modules');
        // fs.symlinkSync(nodeModulesPath, tmpNodeModulesPath);

        exec('ember build -dev', {cwd: appPath}, function(err, stdout, stderr) {
          debugger;
        });

        // merge fixture with tmp ember app root
        // exec('ember build -dev')
        // check contents of tmpDir.name/<tmp-app-name>/dist/

        debugger;
      });
    });

    it('adds a default_icon for app/browser-action/icon.+(png|jpg|gif)', function() {
      const { manifest } = ksBuild;
      assert.equal(manifest.browser_action.default_icon, 'browser-action/icon.png')
    });

    it('adds a default_icon.# for app/browser-action/icon-#.+(png|jpg|gif)', function() {

    });

    it.skip('includes icons in the final build inside browser-action/icon-*', function() {
      return build('browser-action-popup').then(function(result) {
        assert(fs.existsSync(path.join(result.directory, 'browser-action/icon-16.png')))
        assert(fs.existsSync(path.join(result.directory, 'browser-action/icon-42.jpg')))
      });
    });
  });
});

function build(fixture) {
  let app = path.join(__dirname, '../fixtures', fixture);
  
  let manifestTree = Manifest.create(app);

  manifestTree = stew.debug(manifestTree, fixture);
  
  builder = new broccoli.Builder(manifestTree);

  return builder.build();
}

function getManifest(dir) {
  const manifestPath = path.join(dir, 'manifest.json');
  assert(fs.existsSync(manifestPath), 'manifest.json file exists');
  return require(manifestPath);
}

function outputFinalBuild(fixture) {  
  let postProcessedTree = writeFile('/index.html', `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>dummy</title>
        <meta name="description" content="">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="dummy/config/environment" content="%7B%22modulePrefix%22%3A%22dummy%22%2C%22environment%22%3A%22development%22%2C%22rootURL%22%3A%22/%22%2C%22locationType%22%3A%22auto%22%2C%22EmberENV%22%3A%7B%22FEATURES%22%3A%7B%7D%2C%22EXTEND_PROTOTYPES%22%3A%7B%22Date%22%3Afalse%7D%7D%2C%22APP%22%3A%7B%22name%22%3A%22dummy%22%2C%22version%22%3A%220.0.0+5daf6130%22%7D%2C%22exportApplicationGlobal%22%3Atrue%7D" />
        <link rel="stylesheet" href="/assets/vendor.css">
        <link rel="stylesheet" href="/assets/dummy.css">
      </head>
      <body>
        <script src="/assets/vendor.js"></script>
        <script src="/assets/dummy.js"></script>
      </body>
    </html>
  `);
  
  let appPath = path.join(__dirname, '../fixtures', fixture, 'app');
  
  Addon.preProcessedTrees.js = new Funnel(appPath, {
    destDir: 'dummy'
  });

  let distTree = Addon.postprocessTree('all', postProcessedTree);

  distTree = stew.debug(distTree, 'mocha');

  let builder = new broccoli.Builder(distTree);

  return builder.build().then(result => {
    Addon.preProcessedTrees = {};
    return result;
  });
}