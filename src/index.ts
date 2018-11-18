import 'rxjs';
import { Observable, ObservableInput } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/observable/bindNodeCallback';
import 'rxjs/add/observable/defer';
import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/switch';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/takeUntil';

interface BindMeteorEnvironmentFn {
  <A1 = any>(fn: (a1: A1) => any): (a1: A1) => void;
  <A1 = any, A2 = any>(fn: (a1: A1, a2: A2) => any): (a1: A1, a2: A2) => void;
  <A1, A2, A3>(fn: (a1: A1, a2: A2, a3: A3) => any): (a1: A1, a2: A2, a3: A3) => void;
  <A1, A2, A3, A4>(fn: (a1: A1, a2: A2, a3: A3, a4: A4) => any): (a1: A1, a2: A2, a3: A3, a4: A4) => void;
};

interface MeteorWrapAsyncFn {
  <T>(fn: (callback: (error: any, result?: T) => void) => void): () => T;
  <T, A1>(fn: (a1: A1, callback: (error: any, result: T) => void) => void): (a1: A1) => T;
  <T, A1, A2>(fn: (a1: A1, a2: A2, callback: (error: any, result: T) => void) => void): (a1: A1, a2: A2) => T;
  <T, A1, A2, A3>(fn: (a1: A1, a2: A2, a3: A3, callback: (error: any, result: T) => void) => void): (a1: A1, a2: A2, a3: A3) => T;
}

interface MeteorAwaitPromiseFn {
  <T>(promise: Promise<T>): T;
}

interface PromisifyNodeCallbackFn {
  <T>(fn: (callback: (error: any, result?: T) => void) => void): () => Promise<T>;
  <T, A1>(fn: (a1: A1, callback: (error: any, result: T) => void) => void): (a1: A1) => Promise<T>;
  <T, A1, A2>(fn: (a1: A1, a2: A2, callback: (error: any, result: T) => void) => void): (a1: A1, a2: A2) => Promise<T>;
  <T, A1, A2, A3>(fn: (a1: A1, a2: A2, a3: A3, callback: (error: any, result: T) => void) => void): (a1: A1, a2: A2, a3: A3) => Promise<T>;
};

const Utils: {
  bindMeteorEnvironment: BindMeteorEnvironmentFn;
  promisifyNodeCallback: PromisifyNodeCallbackFn;
  meteorAwaitPromise: MeteorAwaitPromiseFn;
  meteorWrapAsync: MeteorWrapAsyncFn;
} = {
  bindMeteorEnvironment: Meteor.bindEnvironment.bind(Meteor),
  promisifyNodeCallback(fn: (...args: any[]) => void): (...args: any[]) => Promise<any> {
    return (...args: any[]) => new Promise<any>((resolve, reject) => {
      fn(...args, (error: any, result?: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });
  },
  meteorAwaitPromise: (promise: Promise<any>) => Utils.meteorWrapAsync(
    (promise: Promise<any>, callback: (error: any, result?: any) => void) => {
      promise.then((result) => {
        callback(null, result);
      }, (error) => {
        callback(error);
      });
    }
  )(promise),
  meteorWrapAsync: Meteor.wrapAsync.bind(Meteor),
};

interface CollectionFindWrapperFn {
  <T>(
    collection: Mongo.Collection<T>,
    selector?: Mongo.Selector<T> | Mongo.ObjectID | string,
    options?: {
      sort?: Mongo.SortSpecifier;
      skip?: number;
      limit?: number;
      fields?: Mongo.FieldSpecifier;
      reactive?: boolean;
      transform?: Function;
    },
  ): Promise<Mongo.Cursor<T>>;
}

interface CollectionFindOneWrapperFn {
  <T>(
    collection: Mongo.Collection<T>,
    selector?: Mongo.Selector<T> | Mongo.ObjectID | string,
    options?: {
      sort?: Mongo.SortSpecifier;
      skip?: number;
      fields?: Mongo.FieldSpecifier;
      reactive?: boolean;
      transform?: Function;
    },
  ): Observable<T>;
}

interface CollectionInsertWrapperFn {
  <T>(
    collection: Mongo.Collection<T>,
    document: T
  ): Observable<string>;
}

interface CollectionRemoveWrapperFn {
  <T>(
    collection: Mongo.Collection<T>,
    selector: Mongo.Selector<T> | Mongo.ObjectID | string,
  ): Observable<number>;
}

interface CollectionUpdateWrapperFn {
  <T>(
    collection: Mongo.Collection<T>,
    selector: Mongo.Selector<T> | Mongo.ObjectID | string,
    modifier: Mongo.Modifier<T>,
    options?: {
      multi?: boolean;
      upsert?: boolean;
    } | undefined,
  ): Observable<number>;
}

interface CollectionUpsertWrapperFn {
  <T>(
    collection: Mongo.Collection<T>,
    selector: Mongo.Selector<T> | Mongo.ObjectID | string,
    modifier: Mongo.Modifier<T>,
    options?: {
      multi?: boolean;
    },
  ): Observable<{
    numberAffected?: number;
    insertedId?: string;
  }>;
}

interface CursorCountWrapperFn {
  <T>(
    cursorPromise: Promise<Mongo.Cursor<T>>,
    applySkipLimit?: boolean,
  ): Observable<number>;
}

interface CursorFetchWrapperFn {
  <T>(
    cursorPromise: Promise<Mongo.Cursor<T>>,
  ): Observable<T[]>;
}

export interface ObservableCursorObserveCallbacks<
  T,
  Initial = never,
  Added = never,
  AddedAt = never,
  Changed = never,
  ChangedAt = never,
  Removed = never,
  RemovedAt = never,
  MovedTo = never,
> {
  initial?(documents: T[]): ObservableInput<Initial> | void;
  added?(document: T): ObservableInput<Added> | void;
  addedAt?(document: T, atIndex: number, before: T): ObservableInput<AddedAt> | void;
  changed?(newDocument: T, oldDocument: T): ObservableInput<Changed> | void;
  changedAt?(newDocument: T, oldDocument: T, indexAt: number): ObservableInput<ChangedAt> | void;
  removed?(oldDocument: T): ObservableInput<Removed> | void;
  removedAt?(oldDocument: T, atIndex: number): ObservableInput<RemovedAt> | void;
  movedTo?(document: T, fromIndex: number, toIndex: number, before: T): ObservableInput<MovedTo> | void;
}

export interface ObservableCursorObserveChangesCallbacks {
  added?(id: string, fields: Object): void;
  addedBefore?(id: string, fields: Object, before: Object): void;
  changed?(id: string, fields: Object): void;
  movedBefore?(id: string, before: Object): void;
  removed?(id: string): void;
}

interface CursorObserveWrapperFn {
  <
    T,
    Initial = never,
    Added = never,
    AddedAt = never,
    Changed = never,
    ChangedAt = never,
    Removed = never,
    RemovedAt = never,
    MovedTo = never,
  >(
    cursorPromise: Promise<Mongo.Cursor<T>>,
    callbacks: ObservableCursorObserveCallbacks<
      T,
      Initial,
      Added,
      AddedAt,
      Changed,
      ChangedAt,
      Removed,
      RemovedAt,
      MovedTo
    >,
  ): Observable<Observable<
    Initial
    | Added
    | AddedAt
    | Changed
    | ChangedAt
    | Removed
    | RemovedAt
    | MovedTo
  >>;
}

const Wrappers: {
  Collection: {
    find: CollectionFindWrapperFn;
    findOne: CollectionFindOneWrapperFn;
    insert: CollectionInsertWrapperFn;
    remove: CollectionRemoveWrapperFn;
    update: CollectionUpdateWrapperFn;
    upsert: CollectionUpsertWrapperFn;
  };
  Cursor: {
    count: CursorCountWrapperFn;
    fetch: CursorFetchWrapperFn;
    observe: CursorObserveWrapperFn;
  };
} = {
  Collection: {
    find: Utils.promisifyNodeCallback(Utils.bindMeteorEnvironment((
      collection: Mongo.Collection<any>,
      ...args: any[]
    ) => {
      const callback: Function = args.pop();
      let cursor: Mongo.Cursor<any>;
      try {
        cursor = collection.find(...args);
      } catch (error) {
        callback(error);
        return;
      }
      callback(null, cursor);
    })),
    findOne: Observable.bindNodeCallback(Utils.bindMeteorEnvironment((
      collection: Mongo.Collection<any>,
      ...args: any[]
    ) => {
      const callback: Function = args.pop();
      let document: any;
      try {
        document = collection.findOne(...args);
      } catch (error) {
        callback(error);
        return;
      }
      callback(null, document);
    })),
    insert: Observable.bindNodeCallback(Utils.bindMeteorEnvironment((
      collection: Mongo.Collection<any>,
      document: any,
      callback: Function,
    ) => {
      let _id: string;
      try {
        _id = collection.insert(document);
      } catch (error) {
        callback(error);
        return;
      }
      callback(null, _id);
    })),
    remove: Observable.bindNodeCallback(Utils.bindMeteorEnvironment((
      collection: Mongo.Collection<any>,
      selector: Mongo.Selector<any> | Mongo.ObjectID | string,
      callback: Function,
    ) => {
      let changes: number;
      try {
        changes = collection.remove(selector);
      } catch (error) {
        callback(error);
        return;
      }
      callback(null, changes);
    })),
    update: Observable.bindNodeCallback(Utils.bindMeteorEnvironment((
      collection: Mongo.Collection<any>,
      selector: Mongo.Selector<any> | Mongo.ObjectID | string,
      modifier: Mongo.Modifier<any>,
      ...args: any[]
    ) => {
      const callback: Function = args.pop();
      let numberAffected: number;
      try {
        numberAffected = collection.update(selector, modifier, ...args);
      } catch (error) {
        callback(error);
        return;
      }
      callback(null, numberAffected);
    })),
    upsert: Observable.bindNodeCallback(Utils.bindMeteorEnvironment((
      collection: Mongo.Collection<any>,
      selector: Mongo.Selector<any> | Mongo.ObjectID | string,
      modifier: Mongo.Modifier<any>,
      ...args: any[]
    ) => {
      const callback: Function = args.pop();
      let result: {
        numberAffected?: number;
        insertedId?: string;
      };
      try {
        result = collection.upsert(selector, modifier, ...args);
      } catch (error) {
        callback(error);
        return;
      }
      callback(null, result);
    })),
  },
  Cursor: {
    count: Observable.bindNodeCallback(Utils.bindMeteorEnvironment((
      cursorPromise: Promise<Mongo.Cursor<any>>,
      ...args: any[]
    ) => {
      const callback: Function = args.pop();
      let count: number;
      try {
        const cursor = Utils.meteorAwaitPromise(cursorPromise);
        count = cursor.count(...args);
      } catch (error) {
        callback(error);
        return;
      }
      callback(null, count);
    })),
    fetch: Observable.bindNodeCallback(Utils.bindMeteorEnvironment((
      cursorPromise: Promise<Mongo.Cursor<any>>,
      callback: Function,
    ) => {
      let result: any[];
      try {
        const cursor = Utils.meteorAwaitPromise(cursorPromise);
        result = cursor.fetch();
      } catch (error) {
        callback(error);
        return;
      }
      callback(null, result);
    })),
    observe: Observable.bindNodeCallback(Utils.bindMeteorEnvironment((
      cursorPromise: Promise<Mongo.Cursor<any>>,
      {
        initial,
        added,
        addedAt,
        changed,
        changedAt,
        removed,
        removedAt,
        movedTo,
      }: ObservableCursorObserveCallbacks<any, any, any, any, any, any, any, any, any>,
      callback: (error: any, result?: any) => void,
    ) => {
      callback(null, Observable.create(Utils.bindMeteorEnvironment((
        observer: Observer<any>
      ) => {
        let handle: Meteor.LiveQueryHandle;
        let initialDocuments: any[] | null = [];
        const finish$ = new Subject<void>();
        const observerProxy = {
          error(error: any) {
            observer.error(error);
            finish$.next();
          },
          next: observer.next.bind(observer),
        };

        try {
          const cursor = Utils.meteorAwaitPromise(cursorPromise);
          handle = cursor.observe({
            added: added || (initial && !addedAt)
              ? (document: any) => {
                if (initialDocuments) {
                  initialDocuments.push(document);
                } else if (added) {
                  Observable
                    .defer(() => {
                      const result = added(document);
                      return result
                        ? Observable.from(result)
                        : Observable.empty()
                      ;
                    })
                    .takeUntil(finish$)
                    .subscribe(observerProxy)
                  ;
                }
              }
              : undefined
            ,
            addedAt: addedAt
              ? (document: any, atIndex: number, before: any) => {
                if (initialDocuments) {
                  initialDocuments.splice(atIndex, 0, document);
                } else {
                  Observable
                    .defer(() => {
                      const result = addedAt(document, atIndex, before);
                      return result
                        ? Observable.from(result)
                        : Observable.empty()
                      ;
                    })
                    .takeUntil(finish$)
                    .subscribe(observerProxy)
                  ;
                }
              }
              : undefined
            ,
            changed: changed
              ? (newDocument: any, oldDocument: any) => {
                Observable
                  .defer(() => {
                    const result = changed(newDocument, oldDocument);
                    return result
                      ? Observable.from(result)
                      : Observable.empty()
                    ;
                  })
                .takeUntil(finish$)
                  .subscribe(observerProxy)
                ;
              }
              : undefined
            ,
            changedAt: changedAt
              ? (newDocument: any, oldDocument: any, indexAt: number) => {
                Observable
                .defer(() => {
                  const result = changedAt(newDocument, oldDocument, indexAt);
                  return result
                    ? Observable.from(result)
                    : Observable.empty()
                  ;
                })
            .takeUntil(finish$)
                .subscribe(observerProxy)
                ;
              }
              : undefined
            ,
            removed: removed
              ? (oldDocument: any) => {
                Observable
                  .defer(() => {
                    const result = removed(oldDocument);
                    return result
                      ? Observable.from(result)
                      : Observable.empty()
                    ;
                  })
                .takeUntil(finish$)
                  .subscribe(observerProxy)
                ;
              }
              : undefined
            ,
            removedAt: removedAt
              ? (oldDocument: any, atIndex: number) => {
                Observable
                  .defer(() => {
                    const result = removedAt(oldDocument, atIndex);
                    return result
                      ? Observable.from(result)
                      : Observable.empty()
                    ;
                  })
                .takeUntil(finish$)
                  .subscribe(observerProxy)
                ;
              }
              : undefined
            ,
            movedTo: movedTo
              ? (document: any, fromIndex: number, toIndex: number, before: any) => {
                Observable
                  .defer(() => {
                    const result = movedTo(document, fromIndex, toIndex, before);
                    return result
                      ? Observable.from(result)
                      : Observable.empty()
                    ;
                  })
                .takeUntil(finish$)
                  .subscribe(observerProxy)
                ;
              }
              : undefined
            ,
          });

          if (initial) {
            Observable
              .of(initialDocuments)
              .switchMap((documents) => {
                const result = initial(documents);
                return result
                  ? Observable.from(result)
                  : Observable.empty()
                ;
              })
              .takeUntil(finish$)
              .subscribe(observerProxy)
            ;
          }

          initialDocuments = null;
        } catch (error) {
          observerProxy.error(error);
        }

        return () => {
          handle.stop();
          finish$.next();
        };
      })));
    })),
  },
};

export class ObservableCursor<T> {
  count: (
    applySkipLimit?: boolean
  ) => Observable<number> = function countFn(
    this: ObservableCursor<T>,
    ...args: [boolean | undefined]
  ): Observable<number> {
    return Wrappers.Cursor.count(this.cursor, ...args);
  };

  constructor(
    public readonly cursor: Promise<Mongo.Cursor<T>>,
  ) {}

  fetch(): Observable<T[]> {
    return Wrappers.Cursor.fetch(this.cursor);
  };

  observe<
    Initial = never,
    Added = never,
    AddedAt = never,
    Changed = never,
    ChangedAt = never,
    Removed = never,
    RemovedAt = never,
    MovedTo = never,
  >(callbacks: ObservableCursorObserveCallbacks<
    T,
    Initial,
    Added,
    AddedAt,
    Changed,
    ChangedAt,
    Removed,
    RemovedAt,
    MovedTo
  >): Observable<
    Initial
    | Added
    | AddedAt
    | Changed
    | ChangedAt
    | Removed
    | RemovedAt
    | MovedTo
  > {
    return Wrappers.Cursor.observe(this.cursor, callbacks).switch();
  }
}

export class ObservableCollection<T> {
  find: (
    selector?: Mongo.Selector<T> | Mongo.ObjectID | string,
    options?: {
      sort?: Mongo.SortSpecifier;
      skip?: number;
      limit?: number;
      fields?: Mongo.FieldSpecifier;
      reactive?: boolean;
      transform?: Function;
    }
  ) => ObservableCursor<T> = function findFn(
    this: ObservableCollection<T>,
    ...args: [
      Mongo.Selector<T> | Mongo.ObjectID | string | undefined,
      {
        sort?: Mongo.SortSpecifier;
        skip?: number;
        limit?: number;
        fields?: Mongo.FieldSpecifier;
        reactive?: boolean;
        transform?: Function;
      } | undefined
    ]
  ): ObservableCursor<T> {
    return new ObservableCursor(Wrappers.Collection.find(this.collection, ...args));
  }

  findOne: (
    selector?: Mongo.Selector<T> | Mongo.ObjectID | string,
    options?: {
      sort?: Mongo.SortSpecifier;
      skip?: number;
      fields?: Mongo.FieldSpecifier;
      reactive?: boolean;
      transform?: Function;
    }
  ) => Observable<T> = function findOneFn(
    this: ObservableCollection<T>,
    ...args: [
      Mongo.Selector<T> | Mongo.ObjectID | string | undefined,
      {
        sort?: Mongo.SortSpecifier;
        skip?: number;
        fields?: Mongo.FieldSpecifier;
        reactive?: boolean;
        transform?: Function;
      } | undefined
    ]
  ): Observable<T> {
    return Wrappers.Collection.findOne(this.collection, ...args);
  }

  update: (
    selector: Mongo.Selector<T> | Mongo.ObjectID | string,
    modifier: Mongo.Modifier<T>,
    options?: {
      multi?: boolean;
      upsert?: boolean;
    }
  ) => Observable<number> = function updateFn(
    this: ObservableCollection<T>,
    selector: Mongo.Selector<T> | Mongo.ObjectID | string,
    modifier: Mongo.Modifier<T>,
    ...args: [{
      multi?: boolean;
      upsert?: boolean;
    } | undefined]
  ): Observable<number> {
    return Wrappers.Collection.update(this.collection, selector, modifier, ...args);
  };

  upsert: (
    selector: Mongo.Selector<T> | Mongo.ObjectID | string,
    modifier: Mongo.Modifier<T>,
    options?: {
      multi?: boolean;
    }
  ) => Observable<{
    numberAffected?: number;
    insertedId?: string;
  }> = function upsertFn(
    this: ObservableCollection<T>,
    selector: Mongo.Selector<T> | Mongo.ObjectID | string,
    modifier: Mongo.Modifier<T>,
    ...args: [{
      multi?: boolean;
    } | undefined]
  ): Observable<{
    numberAffected?: number;
    insertedId?: string;
  }> {
    return Wrappers.Collection.upsert(this.collection, selector, modifier, ...args);
  };

  constructor(
    public readonly collection: Mongo.Collection<T>,
  ) {}

  insert(document: T): Observable<string> {
    return Wrappers.Collection.insert(this.collection, document);
  }

  rawCollection(): any {
    return this.collection.rawCollection();
  }

  rawDatabase(): any {
    return this.collection.rawDatabase();
  }

  remove(
    selector: Mongo.Selector<T> | Mongo.ObjectID | string,
  ): Observable<number> {
    return Wrappers.Collection.remove(this.collection, selector);
  }
}
