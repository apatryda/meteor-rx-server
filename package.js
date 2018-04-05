Package.describe({
  name: 'apatryda:meteor-rx-server',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: 'RxJs wrapper over MongoDb access, server code',
  // URL to the Git repository containing the source code for this package.
  git: 'git@github.com:apatryda/meteor-rx-server.git',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Npm.depends({
  rxjs: '5.5.8',
});

Package.onUse(function(api) {
  api.versionsFrom('1.6');
  api.use('ecmascript');
  api.mainModule('meteor-rx-server.js');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('apatryda:meteor-rx-server');
  api.mainModule('meteor-rx-server-tests.js');
});
