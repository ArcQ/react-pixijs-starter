import { obsList, update, onFinishLoad } from './run';
import mainLoadingScene from '../loading/main';
import { generateGameMap } from './api';

export default function getSceneObj() {
  return {
    name: 'level-one-scene',
    loading: mainLoadingScene,
    uiRoute: '/level-one',
    assets: ['levelOne', 'goblins'],
    load$: generateGameMap(),
    obsList,
    update,
    onFinishLoad,
  };
}
