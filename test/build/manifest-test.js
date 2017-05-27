const broccoli = require('ember-cli-broccoli');
const {expect, assert} = require('chai');
const path = require('path');
const fs = require('fs-extra');

const stew = require('broccoli-stew');

const Manifest = require('../../lib/build/manifest');

let builder;

describe('manifest.json', function() {
  after(function() {
    if (builder) return builder.cleanup();
  });

  it('merges app/manifest.json', function() {
    return build('simple').then(function(result) {
      let manifest = getManifest(result.directory);
      expect(manifest.name).to.equal('a simple app');
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