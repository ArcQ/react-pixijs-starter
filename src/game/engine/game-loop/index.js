import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import {
  zip, expand, filter, map, tap, withLatestFrom, share, buffer,
} from 'rxjs/operators';

import config from 'config.json';
import { flatten } from 'utils/arrUtils';

import { clampToFPS } from './utils';

const FPS = config.game.FPS || 30;

/**
 * getBufferedEvent - Here we buffer our event stream until we get a new frame emission. This
 gives us a set of all the events that have triggered since the previous
 frame. We reduce these all down to a single dictionary of events that occured
 *
 * @param frames$
 * @param event$
 * @returns {undefined}
 */

function getBufferedEvent(frames$, event$) {
  const eventPerFrame$ = event$
    .pipe(
      buffer(frames$),
      // map(frames => frames.reduce(
      //   (prev, curr) => ({ ...prev, ...curr }), {},
      // )),
    );
  return eventPerFrame$;
}

/**
 * calculateStep - We use recursively call this function using expand to give us each
 * new Frame based on the window.requestAnimationFrame calls.
 * Expand emits the value of the called functions
 * returned observable, as well as recursively calling the function with that same
 * emitted value. This works perfectly for calculating our frame steps because each step
 * needs to know the lastStepFrameTime to calculate the next.
 *
 * @param prevFrame
 * @returns {Observable}
 */
function calculateStep(prevFrame) {
  return Observable.create((observer) => {
    requestAnimationFrame((frameStartTime) => {
      const deltaTime = prevFrame ? (frameStartTime - prevFrame.frameStartTime) / 1000 : 0;
      observer.next({
        frameStartTime,
        deltaTime,
      });
    });
  })
    .pipe(
      map(clampToFPS(FPS)),
    );
}

/**
 * createGameLoop - returns an observable game loop that you can subscribe to,
 * will run until you manually cancel
 *
 * @param obsGetterList - event getters that are functions that return observables such as
 * $keysDown to merge with the main frame$ observable, getters should take an argument frame$
 * so for example they can buffer to the frame$ observable
 * @param update - update function called every frame update, returns a new game state obj
 * @param gameState {Observable} - should be an observable...most probably a behaviorsubject that
 * many can subscribe to
 * @returns frames {Observable} - returns the frame observable that a scene can subscribre to
 */
export function createGameLoop(obsList, update, gameState$) {
  const frames$ = of(undefined)
    .pipe(
      expand(val => calculateStep(val)),
      filter(frame => frame !== undefined),
      map(frame => frame.deltaTime),
      share(),
    );

  const bufferedObsList = obsList.map(obsGetter => getBufferedEvent(frames$, obsGetter));

  return frames$.pipe(
    zip(gameState$, ...bufferedObsList,
      (deltaTime, _gameState$, ...args) => [deltaTime, _gameState$, flatten(args)]),
    map(args => update(...args)),
    tap(gameState => gameState$.next(gameState)),
  );
}

export default {};
