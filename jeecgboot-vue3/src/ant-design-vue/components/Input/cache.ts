let cache:
  | {
      usedSlots: Set<string>;
    }
  | undefined;

export default function () {
  if (!cache) {
    cache = {
      usedSlots: new Set<string>(['prefix', 'suffix']),
    };
  }
  return cache;
}
