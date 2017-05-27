import Ember from 'ember';
import config from './config/environment';

const Router = Ember.Router.extend({
  location: config.locationType,
  rootURL: config.rootURL
});

Router.map(function() {
  let standardRoutes = [
    'browser-popup',
    'page-popup',
    'sidebar',
    'options-page',
    'devtools-panel',
    'x-ray',
    'native',
    'iframe'
  ];
  
  standardRoutes.forEach(name => this.route(name));
});

export default Router;