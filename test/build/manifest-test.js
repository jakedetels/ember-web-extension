const broccoli        = require('ember-cli-broccoli');
const chai            = require('chai');
const chaiAsPromised  = require('chai-as-promised');
const fs              = require('fs-extra');
const stew            = require('broccoli-stew');

const path            = require('path');

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
      const boot1 = path.join(directory, 'content-scripts', 'cs-pod-1.js');
      const boot2 = path.join(directory, 'content-scripts', 'cs-pod-2.js');
      assert(fs.existsSync(boot1), 'cs-1 boot file created');
      assert(fs.existsSync(boot2), 'cs-2 boot file created');
    });
    
    it('adds the boot js file to the manifest content_script entries', function() {
      const cs = ksBuild.manifest.content_scripts;
      assert(cs[0].js[0] === 'content-scripts/cs-pod-1.js', 'first cs manifest entry set');
      assert(cs[1].js[0] === 'content-scripts/cs-pod-2.js', 'second cs manifest entry set');
    });

    it('creates boot files for each content script', function() {
      const cs = ksBuild.manifest.content_scripts;
      const cs1Path = path.join(ksBuild.directory, cs[0].js[0]);
      const cs2Path = path.join(ksBuild.directory, cs[1].js[0]);

      const cs1Contents = fs.readFileSync(cs1Path).toString();
      const cs2Contents = fs.readFileSync(cs2Path).toString();
      const bootJs = `require('my-app/app').create({name: 'my-app', version: '1.2.3'});`;

      assert.equal(cs1Contents, `var context = 'cs-pod-1';${bootJs}`);
      assert.equal(cs2Contents, `var context = 'cs-pod-2';${bootJs}`);
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