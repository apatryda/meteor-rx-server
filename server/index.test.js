import { expect } from 'chai';
import { Mongo } from 'meteor/mongo';
import { Observable } from 'rxjs';
import { marbles } from 'rxjs-marbles';
import {
  ObservableCollection,
  ObservableCursor,
} from '../dist';

const collection = new Mongo.Collection('test');
const observableCollection = new ObservableCollection(collection);

describe('Observable Collection', function () {
  beforeEach(function () {
    collection.remove({});
    collection.insert({
      _id: '1',
      x: 'a',
      y: 'b',
    });
    collection.insert({
      _id: '2',
      x: 'a',
      y: 'd',
    });
  });

  it('should find one document', function (done) {
    observableCollection
      .findOne({
        x: 'a',
        y: 'b',
      })
      .do((document) => {
        expect(document).to.have.property('_id', '1');
      })
      .finally(done)
      .subscribe(() => {})
    ;
  });

  it('should insert', function (done) {
    observableCollection
      .insert({
        x: 'c',
        y: 'd',
      })
      .do((_id) => {
        expect(_id).to.be.a('string');
      })
      .switchMap(_id =>
        observableCollection.findOne(_id)
      )
      .do((document) => {
        expect(document).to.exist;
      })
      .finally(done)
      .subscribe(() => {})
    ;
  });
});

let observableCursor;

describe('Observable Cursor', function () {
  beforeEach(function () {
    collection.remove({});
    collection.insert({
      _id: '1',
      x: 'a',
      y: 'b',
    });
    collection.insert({
      _id: '2',
      x: 'c',
      y: 'd',
    });
    observableCursor = observableCollection.find({ x: 'a' });
  });

  it('should find a matching document', marbles(function (m) {
    const values = {
      a: { x: 'a' },
      b: [
        { _id: '1', x: 'a', y: 'b' },
      ],
    };
    const source = m.hot('--^-a-|', values);
    const subs =           '^---!';
    const expected =       '--b-|';
    const destination = source
      .switchMap(selector => observableCollection.find(selector))
      .switchMap(cursor => cursor.fetch())
    ;
    m.expect(destination).toBeObservable(expected, values);
    m.expect(source).toHaveSubscriptions(subs);
  }));

  // it('should notice an insert', marbles(function (m) {
  //   const values = {
  //     a: { x: 'a' },
  //     b: { _id: '3', x: 'a', y: 'f' },
  //     c: [
  //       { _id: '1', x: 'a', y: 'b' },
  //       { _id: '2', x: 'a', y: 'd' },
  //     ],
  //     d: { _id: '3', x: 'a', y: 'f' },
  //     e: '3',
  //   };
  //   // m.bind();
  //   const source1 = m.hot('--^-a--------------|', values);
  //   const source2 = m.hot('--^---b------------|', values);
  //   const sub1 =            '^----------------!';
  //   const sub2 =            '^----------------!';
  //   const expected =        '----------------d-';
  //   const destination = Observable.merge(
  //     source1
  //       .switchMap(selector => observableCollection.find(selector))
  //       .switchMap(cursor => cursor.observe({
  //         // initial(documents) {
  //         //   return Observable.of(documents);
  //         // },
  //         added(document) {
  //           return Observable.of(document);
  //         },
  //       })),
  //     source2
  //       .switchMap(document => observableCollection.insert(document))
  //       .ignoreElements(),
  //   );
  //   m.expect(destination).toBeObservable(expected, values);
  //   m.expect(source1).toHaveSubscriptions(sub1);
  //   m.expect(source2).toHaveSubscriptions(sub2);
  // }));

  it('should notice a matching insert', function (done) {
    observableCollection
      .find({ x: 'a' })
      .mergeMap(cursor => cursor
        .observe({
          initial: documents => Observable
            .of({ initial: documents })
            .concat(observableCollection
              .insert({ _id: '3', x: 'a', y: 'f' })
              .ignoreElements()
            ),
          added: document => [{ added: document }],
          changed: (...documents) => [{ changed: documents }],
          removed: document => [{ removed: document }],
        })
        .catch(error => [{ error }])
      )
      .scan((acc, event) => [...acc, event], [])
      .debounceTime(100)
      .take(1)
      .subscribe((events) => {
        try {
          expect(events).to.have.deep.ordered.members([
            { initial: [
              { _id: '1', x: 'a', y: 'b' },
            ] },
            { added: { _id: '3', x: 'a', y: 'f' } }
          ]);
          done();
        } catch (error) {
          done(error);
        }
      })
    ;
  });

  it('should ignore a non-matching insert', function (done) {
    observableCollection
      .find({ x: 'a' })
      .mergeMap(cursor => cursor
        .observe({
          initial: documents => Observable
            .of({ initial: documents })
            .concat(observableCollection
              .insert({ _id: '3', x: 'c', y: 'b' })
              .ignoreElements()
            ),
          added: document => [{ added: document }],
          changed: (...documents) => [{ changed: documents }],
          removed: document => [{ removed: document }],
        })
        .catch(error => [{ error }])
      )
      .scan((acc, event) => [...acc, event], [])
      .debounceTime(100)
      .take(1)
      .subscribe((events) => {
        try {
          expect(events).to.have.deep.ordered.members([
            { initial: [
              { _id: '1', x: 'a', y: 'b' },
            ] },
          ]);
          done();
        } catch (error) {
          done(error);
        }
      })
    ;
  });

  it('should notice a matching remove', function (done) {
    observableCollection
      .find({ x: 'a' })
      .mergeMap(cursor => cursor
        .observe({
          initial(documents) {
            return Observable
              .of({ initial: documents })
              .concat(Observable
                .merge(
                  observableCollection.remove({ _id: '1' }),
                )
                .ignoreElements()
              )
            ;
          },
          removed(document) {
            return [{ removed: document }];
          },
        })
        .catch(error => [{ error }])
      )
      .scan((acc, event) => [...acc, event], [])
      .debounceTime(100)
      .take(1)
      .subscribe((events) => {
        try {
          expect(events).to.have.deep.ordered.members([
            { initial: [
              { _id: '1', x: 'a', y: 'b' },
            ] },
            { removed: { _id: '1', x: 'a', y: 'b' } }
          ]);
          done();
        } catch (error) {
          done(error);
        }
      })
    ;
  });

  it('should ignore a non-matching remove', function (done) {
    observableCollection
      .find({ x: 'a' })
      .mergeMap(cursor => cursor
        .observe({
          initial: documents => Observable
            .of({ initial: documents })
            .concat(observableCollection
              .remove({ _id: '2' })
              .ignoreElements()
            ),
          added: document => [{ added: document }],
          changed: (...documents) => [{ changed: documents }],
          removed: document => [{ removed: document }],
        })
        .catch(error => [{ error }])
      )
      .scan((acc, event) => [...acc, event], [])
      .debounceTime(100)
      .take(1)
      .subscribe((events) => {
        try {
          expect(events).to.have.deep.ordered.members([
            { initial: [
              { _id: '1', x: 'a', y: 'b' },
            ] },
          ]);
          done();
        } catch (error) {
          done(error);
        }
      })
    ;
  });

  it('should see an update of a matching document into another matching document as a change', function (done) {
    observableCollection
      .find({ x: 'a' })
      .mergeMap(cursor => cursor
        .observe({
          initial: documents => Observable
            .of({ initial: documents })
            .concat(observableCollection
              .update({ _id: '1' }, { $set: { y: 'd' } })
              .ignoreElements()
            ),
          added: document => [{ added: document }],
          changed: (...documents) => [{ changed: documents }],
          removed: document => [{ removed: document }],
        })
        .catch(error => [{ error }])
      )
      .scan((acc, event) => [...acc, event], [])
      .debounceTime(100)
      .take(1)
      .subscribe((events) => {
        try {
          expect(events).to.have.deep.ordered.members([
            { initial: [
              { _id: '1', x: 'a', y: 'b' },
            ] },
            { changed: [
              { _id: '1', x: 'a', y: 'd' },
              { _id: '1', x: 'a', y: 'b' },
            ] },
          ]);
          done();
        } catch (error) {
          done(error);
        }
      })
    ;
  });

  it('should see an update of a matching document into a non-matching document as a removal', function (done) {
    observableCollection
      .find({ x: 'a' })
      .mergeMap(cursor => cursor
        .observe({
          initial: documents => Observable
            .of({ initial: documents })
            .concat(observableCollection
              .update({ _id: '1' }, { $set: { x: 'c' } })
              .ignoreElements()
            ),
          added: document => [{ added: document }],
          changed: (...documents) => [{ changed: documents }],
          removed: document => [{ removed: document }],
        })
        .catch(error => [{ error }])
      )
      .scan((acc, event) => [...acc, event], [])
      .debounceTime(100)
      .take(1)
      .subscribe((events) => {
        try {
          expect(events).to.have.deep.ordered.members([
            { initial: [
              { _id: '1', x: 'a', y: 'b' },
            ] },
            { removed: { _id: '1', x: 'a', y: 'b' } },
          ]);
          done();
        } catch (error) {
          done(error);
        }
      })
    ;
  });

  it('should see an update of a non-matching document into a matching document as an addition', function (done) {
    observableCollection
      .find({ x: 'a' })
      .mergeMap(cursor => cursor
        .observe({
          initial: documents => Observable
            .of({ initial: documents })
            .concat(observableCollection
              .update({ _id: '2' }, { $set: { x: 'a' } })
              .ignoreElements()
            ),
          added: document => [{ added: document }],
          changed: (...documents) => [{ changed: documents }],
          removed: document => [{ removed: document }],
        })
        .catch(error => [{ error }])
      )
      .scan((acc, event) => [...acc, event], [])
      .debounceTime(100)
      .take(1)
      .subscribe((events) => {
        try {
          expect(events).to.have.deep.ordered.members([
            { initial: [
              { _id: '1', x: 'a', y: 'b' },
            ] },
            { added: { _id: '2', x: 'a', y: 'd' } },
          ]);
          done();
        } catch (error) {
          done(error);
        }
      })
    ;
  });

  it('should not see an update of a non-matching document into another non-matching document', function (done) {
    observableCollection
      .find({ x: 'a' })
      .mergeMap(cursor => cursor
        .observe({
          initial: documents => Observable
            .of({ initial: documents })
            .concat(observableCollection
              .update({ _id: '2' }, { $set: { y: 'b' } })
              .ignoreElements()
            ),
          added: document => [{ added: document }],
          changed: (...documents) => [{ changed: documents }],
          removed: document => [{ removed: document }],
        })
        .catch(error => [{ error }])
      )
      .scan((acc, event) => [...acc, event], [])
      .debounceTime(100)
      .take(1)
      .subscribe((events) => {
        try {
          expect(events).to.have.deep.ordered.members([
            { initial: [
              { _id: '1', x: 'a', y: 'b' },
            ] },
          ]);
          done();
        } catch (error) {
          done(error);
        }
      })
    ;
  });
});

// describe('my module', function () {
//   it('does something that should be tested', function (done) {
//     this.timeout(10000);
//     ocol
//       .find()
//       .switchMap((cursor) => {
//         console.log('1!!');
//         return cursor.count(false);
//       })
//       .subscribe((res) => {
//         console.log(res);
//         done();
//       })
//     // This code will be executed by the test driver when the app is started
//     // in the correct mode
//   })
// })

// describe('my module', function () {
//   it('does something that should be tested', function () {
//     const count = col.find().count();

//     console.log({ count });

//     // ocol
//     //   .find({}, {})
//     //   .switchMap(cursor => cursor.count())
//     //   .subscribe((res) => {
//     //     console.log(res);
//     //     done();
//     //   })
//     // This code will be executed by the test driver when the app is started
//     // in the correct mode
//   })
// })
