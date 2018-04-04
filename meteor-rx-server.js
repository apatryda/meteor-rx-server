import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

const { Observable, Subject } = require('rxjs');

// Variables exported by this module can be imported by other packages and
// applications. See meteor-rx-server-tests.js for an example of importing.
export const name = 'meteor-rx-server';

export class Cursor {
  count = Observable.bindNodeCallback(
    Meteor.bindEnvironment((callback) => {
      try {
        callback(null, this.cursor.count());
      } catch (error) {
        callback(error);
      }
    })
  );

  fetch = Observable.bindNodeCallback(
    Meteor.bindEnvironment((callback) => {
      try {
        callback(null, this.cursor.fetch());
      } catch (error) {
        callback(error);
      }
    })
  );

  _observe = Observable.bindNodeCallback(
    Meteor.bindEnvironment((_callbacks, callback) => {
      console.log('in _observe');
      callback(null, Observable.create((observer) => {
        console.log('in create');
        let handle = {
          stop() {},
        };
        const callbackNames = Object.keys(_callbacks);
        let subscriptions = {};

        try {
          console.log({ callbackNames });
          const subjects = callbackNames
            .reduce((result, callbackName) => Object.assign({
              [callbackName]: new Subject(),
            }, result), {})
          ;
          const callbacks = callbackNames
            .reduce((result, callbackName) => Object.assign({
              [callbackName](...args) {
                subjects[callbackName].next(args);
              },
            }, result), {})
          ;
          subscriptions = callbackNames
            .reduce((result, callbackName) => Object.assign({
              [callbackName]: subjects[callbackName]
                .do(args => console.log({ args_0: args[0] }))
                .mergeMap(args => _callbacks[callbackName](...args))
                .subscribe(observer),
            }, result), {})
          ;
          handle = this.cursor.observe(callbacks);
        } catch (error) {
          observer.error(error);
        }

        return () => {
          handle.stop();
          callbackNames.forEach((callbackName) => {
            subscriptions[callbackName].unsubscribe();
          })
        };
      }))
    })
  );

  constructor(cursor) {
    this._cursor = cursor;
  }

  get cursor() {
    return this._cursor;
  }

  observe(callbacks) {
    return this._observe(callbacks).switch();
  }

  observeChanges(callbacks) {
    return this._observe(callbacks).switch();
  }
};

export class Collection {
  find = Observable.bindNodeCallback(
    Meteor.bindEnvironment((selector = {}, options = {}, callback) => {
      try {
        const cursor = this.collection.find(selector, options);
        callback(null, new Cursor(cursor));
      } catch (error) {
        callback(error);
      }
    })
  );

  findOne = Observable.bindNodeCallback(
    Meteor.bindEnvironment((selector = {}, options = {}, callback) => {
      try {
        callback(null, this.collection.findOne(selector, options));
      } catch (error) {
        callback(error);
      }
    })
  );

  insert = Observable.bindNodeCallback(
    Meteor.bindEnvironment((document, callback) => {
      try {
        callback(null, this.collection.insert(document));
      } catch (error) {
        callback(error);
      }
    })
  );

  remove = Observable.bindNodeCallback(
    Meteor.bindEnvironment((selector, callback) => {
      try {
        callback(null, this.collection.remove(selector));
      } catch (error) {
        callback(error);
      }
    })
  );

  update = Observable.bindNodeCallback(
    Meteor.bindEnvironment((selector, modifier, options = {}, callback) => {
      try {
        const numberAffected = this.collection.update(selector, modifier, options);
        callback(null, numberAffected);
      } catch (error) {
        callback(error);
      }
    })
  );

  upsert = Observable.bindNodeCallback(
    Meteor.bindEnvironment((selector, modifier, options = {}, callback) => {
      try {
        const {
          insertedId,
          numberAffected,
        } = this.collection.upsert(selector, modifier, options);
        callback(null, {
          insertedId,
          numberAffected,
        });
      } catch (error) {
        callback(error);
      }
    })
  );

  constructor(collection) {
    this._collection = collection;
  }

  get collection() {
    return this._collection;
  }

  count(selector, options) {
    return this
      .find(selector, options)
      .mergeMap(cursor => cursor.count())
    ;
  }

  fetch(selector, options) {
    return this
      .find(selector, options)
      .mergeMap(cursor => cursor.fetch())
    ;
  }

  observe(callbacks, selector, options) {
    return this
      .find(selector, options)
      .mergeMap(cursor => cursor.observe(callbacks))
    ;
  }

  observeChanges(callbacks, selector, options) {
    return this
      .find(selector, options)
      .mergeMap(cursor => cursor.observeChanges(callbacks))
    ;
  }
};
