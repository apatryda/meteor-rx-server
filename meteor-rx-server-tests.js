// Import Tinytest from the tinytest Meteor package.
import { Tinytest } from "meteor/tinytest";

// Import and rename a variable exported by meteor-rx-server.js.
import { name as packageName } from "meteor/meteor-rx-server";

// Write your tests here!
// Here is an example.
Tinytest.add('meteor-rx-server - example', function (test) {
  test.equal(packageName, "meteor-rx-server");
});
