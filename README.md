# An RxJS wrapper over Meteor MongoDB collections.

## API

### ObservableCollection

```typescript
class ObservableCollection<T> {
  readonly collection: Mongo.Collection<T>;
  find: (selector?: Mongo.Selector<T> | Mongo.ObjectID | string, options?: {
    sort?: Mongo.SortSpecifier;
    skip?: number;
    limit?: number;
    fields?: Mongo.FieldSpecifier;
    reactive?: boolean;
    transform?: Function;
  }) => ObservableCursor<T>;
  findOne: (selector?: Mongo.Selector<T> | Mongo.ObjectID | string, options?: {
    sort?: Mongo.SortSpecifier;
    skip?: number;
    fields?: Mongo.FieldSpecifier;
    reactive?: boolean;
    transform?: Function;
  }) => Observable<T>;
  update: (selector: Mongo.Selector<T> | Mongo.ObjectID | string, modifier: Mongo.Modifier<T>, options?: {
    multi?: boolean;
    upsert?: boolean;
  }) => Observable<number>;
  upsert: (selector: Mongo.Selector<T> | Mongo.ObjectID | string, modifier: Mongo.Modifier<T>, options?: {
    multi?: boolean;
  }) => Observable<{
    numberAffected?: number;
    insertedId?: string;
  }>;
  constructor(collection: Mongo.Collection<T>);
  insert(document: T): Observable<string>;
  rawCollection(): any;
  rawDatabase(): any;
  remove(selector: Mongo.Selector<T> | Mongo.ObjectID | string): Observable<number>;
}

```

### ObservableCursor

```typescript
class ObservableCursor<T> {
  readonly cursor: Promise<Mongo.Cursor<T>>;
  count: (applySkipLimit?: boolean) => Observable<number>;
  constructor(cursor: Promise<Mongo.Cursor<T>>);
  fetch(): Observable<T[]>;
  observe<Initial = never, Added = never, AddedAt = never, Changed = never, ChangedAt = never, Removed = never, RemovedAt = never, MovedTo = never>(callbacks: ObservableCursorObserveCallbacks<T, Initial, Added, AddedAt, Changed, ChangedAt, Removed, RemovedAt, MovedTo>): Observable<Initial | Added | AddedAt | Changed | ChangedAt | Removed | RemovedAt | MovedTo>;
}
```

### ObservableCursorObserveCallbacks

```typescript
interface ObservableCursorObserveCallbacks<T, Initial = never, Added = never, AddedAt = never, Changed = never, ChangedAt = never, Removed = never, RemovedAt = never, MovedTo = never> {
  initial?(documents: T[]): ObservableInput<Initial> | void;
  added?(document: T): ObservableInput<Added> | void;
  addedAt?(document: T, atIndex: number, before: T): ObservableInput<AddedAt> | void;
  changed?(newDocument: T, oldDocument: T): ObservableInput<Changed> | void;
  changedAt?(newDocument: T, oldDocument: T, indexAt: number): ObservableInput<ChangedAt> | void;
  removed?(oldDocument: T): ObservableInput<Removed> | void;
  removedAt?(oldDocument: T, atIndex: number): ObservableInput<RemovedAt> | void;
  movedTo?(document: T, fromIndex: number, toIndex: number, before: T): ObservableInput<MovedTo> | void;
}
```
