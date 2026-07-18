let cache:
  | {
      hasObserver: boolean;
    }
  | undefined;

export default function () {
  if (!cache) {
    cache = {
      hasObserver: typeof ResizeObserver !== 'undefined',
    };
  }
  return cache;
}
