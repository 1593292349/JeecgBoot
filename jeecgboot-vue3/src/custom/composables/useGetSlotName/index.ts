import { useSlots } from 'vue';

export default function () {
  const slots = useSlots();
  return function (base: string, ...nameList: Array<string | undefined>) {
    for (const name of nameList) {
      if (name) {
        const slotName = `${base}-${name}`;
        if (slotName in slots) {
          return slotName;
        }
      }
    }
    return base;
  };
}
