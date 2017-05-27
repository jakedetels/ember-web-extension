const Funnel = require('broccoli-funnel');

const path = require('path');

module.exports = Manifest;

function Manifest(appDir) {
  
}

Manifest.create = function(projectDir) {
  const appDir = path.join(projectDir, 'app');
  
  const appManifest = new Funnel(appDir, {
    include: ['manifest.json']
  });

  return appManifest;
};