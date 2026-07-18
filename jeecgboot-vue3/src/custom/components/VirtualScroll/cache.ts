import type { Axis } from '/@/custom/type';
import type { CacheInfo } from './type';

let cache:
  | {
      infos: {
        [key in Axis]: CacheInfo;
      };
    }
  | undefined;

export default function () {
  if (!cache) {
    cache = {
      infos: {
        x: {
          transform: 'marginLeft',
          size: 'width',
          direction: 'row',
        },
        y: {
          transform: 'marginTop',
          size: 'height',
          direction: 'column',
        },
      },
    };
  }
  return cache;
}
