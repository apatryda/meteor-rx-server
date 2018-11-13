import { Observable, Observer, Subject } from 'rxjs';

export interface ObservableObserveCallbacks<
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
  initial?(documents: T[]): Observable<Initial>;
  added?(document: T): Observable<Added>;
  addedAt?(document: T, atIndex: number, before: T): Observable<AddedAt>;
  changed?(newDocument: T, oldDocument: T): Observable<Changed>;
  changedAt?(newDocument: T, oldDocument: T, indexAt: number): Observable<ChangedAt>;
  removed?(oldDocument: T): Observable<Removed>;
  removedAt?(oldDocument: T, atIndex: number): Observable<RemovedAt>;
  movedTo?(document: T, fromIndex: number, toIndex: number, before: T): Observable<MovedTo>;
}

export interface ObservableObserveChangesCallbacks {
  added?(id: string, fields: Object): void;
  addedBefore?(id: string, fields: Object, before: Object): void;
  changed?(id: string, fields: Object): void;
  movedBefore?(id: string, before: Object): void;
  removed?(id: string): void;
}

export class ObservableCursor<T> {
  fetch: () => Observable<T[]> =
    Observable.bindNodeCallback(Meteor.bindEnvironment((
      callback: Function,
    ) => {
      let result: T[];
      try {
        result = this.cursor.fetch();
      } catch (error) {
        callback(error);
        return;
      }
      callback(null, result);
    }
  ));

  protected _count: (applySkipLimit: boolean | undefined) => Observable<number> =
    Observable.bindNodeCallback(Meteor.bindEnvironment((
      applySkipLimit: boolean | undefined,
      callback: Function,
    ) => {
      let count: number;
      try {
        count = this.cursor.count(applySkipLimit);
      } catch (error) {
        callback(error);
        return;
      }
      callback(null, count);
    }
  ));

  protected _observe: <
    Initial = never,
    Added = never,
    AddedAt = never,
    Changed = never,
    ChangedAt = never,
    Removed = never,
    RemovedAt = never,
    MovedTo = never,
  >(callbacks: ObservableObserveCallbacks<
    T,
    Initial,
    Added,
    AddedAt,
    Changed,
    ChangedAt,
    Removed,
    RemovedAt,
    MovedTo
  >) => Observable<Observable<
    Initial
    | Added
    | AddedAt
    | Changed
    | ChangedAt
    | Removed
    | RemovedAt
    | MovedTo
  >> = Observable.bindNodeCallback(Meteor.bindEnvironment((
    {
      initial,
      added,
      addedAt,
      changed,
      changedAt,
      removed,
      removedAt,
      movedTo,
    }: ObservableObserveCallbacks<T>,
    callback: Function,
  ) => {
    callback(null, Observable.create(Meteor.bindEnvironment((
      observer: Observer<any>
    ) => {
      let handle: Meteor.LiveQueryHandle;
      let initialDocuments: T[] | null = [];
      const finish$ = new Subject<void>();
      const observerProxy = {
        error(error: any) {
          observer.error(error);
          finish$.next();
        },
        next: observer.next.bind(observer),
      };

      try {
        handle = this.cursor.observe({
          added: added || (initial && !addedAt)
            ? (document: T) => {
              if (initialDocuments) {
                initialDocuments.push(document);
              } else if (added) {
                Observable
                  .defer(() => added(document))
                  .takeUntil(finish$)
                  .subscribe(observerProxy)
                ;
              }
            }
            : undefined
          ,
          addedAt: addedAt
            ? (document: T, atIndex: number, before: T) => {
              if (initialDocuments) {
                initialDocuments.splice(atIndex, 0, document);
              } else {
                Observable
                  .defer(() => addedAt(document, atIndex, before))
                  .takeUntil(finish$)
                  .subscribe(observerProxy)
                ;
              }
            }
            : undefined
          ,
          changed: changed
            ? (newDocument: T, oldDocument: T) => {
              Observable
                .defer(() => changed(newDocument, oldDocument))
                .takeUntil(finish$)
                .subscribe(observerProxy)
              ;
            }
            : undefined
          ,
          changedAt: changedAt
            ? (newDocument: T, oldDocument: T, indexAt: number) => {
              Observable
              .defer(() => changedAt(newDocument, oldDocument, indexAt))
              .takeUntil(finish$)
              .subscribe(observerProxy)
              ;
            }
            : undefined
          ,
          removed: removed
            ? (oldDocument: T) => {
              Observable
                .defer(() => removed(oldDocument))
                .takeUntil(finish$)
                .subscribe(observerProxy)
              ;
            }
            : undefined
          ,
          removedAt: removedAt
            ? (oldDocument: T, atIndex: number) => {
              Observable
                .defer(() => removedAt(oldDocument, atIndex))
                .takeUntil(finish$)
                .subscribe(observerProxy)
              ;
            }
            : undefined
          ,
          movedTo: movedTo
            ? (document: T, fromIndex: number, toIndex: number, before: T) => {
              Observable
                .defer(() => movedTo(document, fromIndex, toIndex, before))
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
            .switchMap(initial)
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
  }));

  /*
  TODO: Implement:
  forEach(callback: (doc: T, index: number, cursor: Cursor<T>) => void, thisArg?: any): void;
  map<U>(callback: (doc: T, index: number, cursor: Cursor<T>) => U, thisArg?: any): Array<U>;
  observeChanges(callbacks: ObserveChangesCallbacks): Meteor.LiveQueryHandle;
  */

  constructor(
    public readonly cursor: Mongo.Cursor<T>,
  ) {}

  count(applySkipLimit?: boolean): Observable<number> {
    return this._count(applySkipLimit);
  }

  observe<
    Initial = never,
    Added = never,
    AddedAt = never,
    Changed = never,
    ChangedAt = never,
    Removed = never,
    RemovedAt = never,
    MovedTo = never,
  >(callbacks: ObservableObserveCallbacks<
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
    return this._observe(callbacks).switch();
  }
}

export class ObservableCollection<T> {
  insert: (doc: T) => Observable<string> =
    Observable.bindNodeCallback(Meteor.bindEnvironment((
      doc: T,
      callback: Function,
    ) => {
      let _id: string;
      try {
        _id = this.collection.insert(doc);
      } catch (error) {
        callback(error);
        return;
      }
      callback(null, _id);
    }))
  ;

  remove: (
    selector: Mongo.Selector<T> | Mongo.ObjectID | string,
  ) => Observable<number> =
    Observable.bindNodeCallback(Meteor.bindEnvironment((
      selector: Mongo.Selector<T> | Mongo.ObjectID | string,
      callback: Function,
    ) => {
      let changes: number;
      try {
        changes = this.collection.remove(selector);
      } catch (error) {
        callback(error);
        return;
      }
      callback(null, changes);
    }))
  ;

  protected _find: (
    selector: Mongo.Selector<T> | Mongo.ObjectID | string | undefined,
    options: {
      sort?: Mongo.SortSpecifier;
      skip?: number;
      limit?: number;
      fields?: Mongo.FieldSpecifier;
      reactive?: boolean;
      transform?: Function;
    } | undefined,
  ) => Observable<ObservableCursor<T>> =
    Observable.bindNodeCallback(Meteor.bindEnvironment((
      selector: Mongo.Selector<T> | Mongo.ObjectID | string | undefined,
      options: {
        sort?: Mongo.SortSpecifier;
        skip?: number;
        limit?: number;
        fields?: Mongo.FieldSpecifier;
        reactive?: boolean;
        transform?: Function;
      } | undefined,
      callback: Function,
    ) => {
      let oCursor: ObservableCursor<T>;
      try {
        const cursor = this.collection.find(selector, options);
        oCursor = new ObservableCursor(cursor);
      } catch (error) {
        callback(error);
        return;
      }
      callback(null, oCursor);
    }))
  ;

  protected _findOne: (
    selector: Mongo.Selector<T> | Mongo.ObjectID | string | undefined,
    options: {
      sort?: Mongo.SortSpecifier;
      skip?: number;
      fields?: Mongo.FieldSpecifier;
      reactive?: boolean;
      transform?: Function;
    } | undefined,
  ) => Observable<T> =
    Observable.bindNodeCallback(Meteor.bindEnvironment((
      selector: Mongo.Selector<T> | Mongo.ObjectID | string | undefined,
      options: {
        sort?: Mongo.SortSpecifier;
        skip?: number;
        fields?: Mongo.FieldSpecifier;
        reactive?: boolean;
        transform?: Function;
      } | undefined,
      callback: Function,
    ) => {
      let document: T;
      try {
        document = this.collection.findOne(selector, options);
      } catch (error) {
        callback(error);
        return;
      }
      callback(null, document);
    }))
  ;

  protected _update: (
    selector: Mongo.Selector<T> | Mongo.ObjectID | string,
    modifier: Mongo.Modifier<T>,
    options: {
      multi?: boolean;
      upsert?: boolean;
    } | undefined,
  ) => Observable<number> =
    Observable.bindNodeCallback(Meteor.bindEnvironment((
      selector: Mongo.Selector<T> | Mongo.ObjectID | string,
      modifier: Mongo.Modifier<T>,
      options: {
        multi?: boolean;
        upsert?: boolean;
      } | undefined,
      callback: Function,
    ) => {
      let numberAffected: number;
      try {
        numberAffected = this.collection.update(selector, modifier, options);
      } catch (error) {
        callback(error);
        return;
      }
      callback(null, numberAffected);
    }))
  ;

  protected _upsert: (
    selector: Mongo.Selector<T> | Mongo.ObjectID | string,
    modifier: Mongo.Modifier<T>,
    options: {
      multi?: boolean;
      upsert?: boolean;
    } | undefined,
  ) => Observable<{
    numberAffected?: number;
    insertedId?: string;
  }> = Observable.bindNodeCallback(Meteor.bindEnvironment((
    selector: Mongo.Selector<T> | Mongo.ObjectID | string,
    modifier: Mongo.Modifier<T>,
    options: {
      multi?: boolean;
    } | undefined,
    callback: Function,
  ) => {
    let result: {
      numberAffected?: number;
      insertedId?: string;
    };
    try {
      result = this.collection.upsert(selector, modifier, options);
    } catch (error) {
      callback(error);
      return;
    }
    callback(null, result);
  }));

  constructor(
    public readonly collection: Mongo.Collection<T>,
  ) {}

  find(
    selector?: Mongo.Selector<T> | Mongo.ObjectID | string,
    options?: {
      sort?: Mongo.SortSpecifier;
      skip?: number;
      limit?: number;
      fields?: Mongo.FieldSpecifier;
      reactive?: boolean;
      transform?: Function;
    },
  ): Observable<ObservableCursor<T>> {
    return this._find(selector, options);
  }

  findOne(
    selector?: Mongo.Selector<T> | Mongo.ObjectID | string,
    options?: {
      sort?: Mongo.SortSpecifier;
      skip?: number;
      fields?: Mongo.FieldSpecifier;
      reactive?: boolean;
      transform?: Function;
    },
  ): Observable<T> {
    return this._findOne(selector, options);
  }

  rawCollection(): any {
    return this.collection.rawCollection();
  }

  rawDatabase(): any {
    return this.collection.rawDatabase();
  }

  update(
    selector: Mongo.Selector<T> | Mongo.ObjectID | string,
    modifier: Mongo.Modifier<T>,
    options?: {
      multi?: boolean;
      upsert?: boolean;
    }
  ): Observable<number> {
    return this._update(selector, modifier, options);
  }

  upsert(
    selector: Mongo.Selector<T> | Mongo.ObjectID | string,
    modifier: Mongo.Modifier<T>,
    options?: {
      multi?: boolean;
    }
  ): Observable<{
    numberAffected?: number;
    insertedId?: string;
  }> {
    return this._upsert(selector, modifier, options);
  }
}
