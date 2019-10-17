## RxJS to Promise

| Rxjs | Promise
| - | -
| .then() | .map()<br>.concatMap()<br> .switchMap()<br> .subscribe()
| Promise.all() | forkJoin(...)
|.catch() | import {catchError} from 'reactivex/rxjs/es6/operators/catchError'<br>`.catchError(err: Error)`
| require('util').promisify()(callback)<br> or <br> require('bluebird').promisify(callback) | from() 
|.finally() | finalize()
| | Observable.toPromise()
|.reject() | throwError() <br>or<br>import { ErrorObservable } from 'rxjs/observable/ErrorObservable';<br>`const e = ErrorObservable.create(new Error('My bad'));`<br>`const e2 = new ErrorObservable(new Error('My bad too'));`



```ts
import {Observable, Subject, from, ReplaySubject, BehaviorSubject, of} from 'rxjs';
import {concatMap, mergeMap} 'rxjs/operators';
import api from '__api';

// Create helper function
from(1,2,3,4);
of([])

const obs = new Observable<{msg: string}>(subscriber => {
  for (let i = 0; i<10; i++) {
    subscriber.next({msg: 'test'});
  }
  subscriber.complete();
  return ()=> {
    console.log('I am unsubscribed');
  };
});

const prom = new Promise(resolve => {
  setTimeout(() => 
  resolve({msg: ''});
});

const prom2 = obs.toPromise();

const obs2 = from(Promise.resolve(1));

obs.subscribe(message => console.log(message.msg),
 err => {},
 () => {} // complete
 );

obs.subscribe();

const sub = new Subject<string>();
sub.next(...);
sub.complete();


const rsub = new ReplaySubject(1); // Promise
rsub.subscribe(msg => console.log(msg));

rsub.next('foobar');

rsub.subscribe(msg => console.log(msg));


const bsub = new BehaviorSubject<number>(0);
bsub.subscribe();
bsub.getValue(); // 0
bsub.next(1);
bsub.getValue(); // 1


bsub.pipe(

).subscribe();

const bossCall = new Subject<string>();

const flattened = bossCall.pipe(
  concatMap(msg => {
    // API1
    return new Observable<number>(sub => {
      //...
      const tel = 123;
      sub.next(tel);
      // ...
      sub.complete();
    }); // 10, 5
  }),
  concatMap(() => {
    // API2
    return api.get();
  })
);


flattened.subscribe(tel => console.log(tel)); // 15


api.get().then(res => api2.get()).then(() => {});
```




