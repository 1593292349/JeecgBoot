import type { SizeObject } from '/@/custom/components/ResizeObserver/type';
import useWindowSize from '../useWindowSize';

export default function () {
  const { windowSize } = useWindowSize({});
  return function ({
    scrollSize,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    limitSize,
  }: {
    scrollSize: SizeObject;
    minWidth?: number | null;
    minHeight?: number | null;
    maxWidth?: number | null;
    maxHeight?: number | null;
    limitSize?: [number, number] | null;
  }) {
    let { width, height } = scrollSize;
    //region 限制最大不超过整个屏幕
    const { width: windowWidth, height: windowHeight } = windowSize;
    if (width > windowWidth) {
      width = windowWidth;
    }
    if (height > windowHeight) {
      height = windowHeight;
    }
    //endregion
    if (limitSize) {
      const [limitWidth, limitHeight] = limitSize;
      if (height > limitHeight) {
        height = limitHeight;
      }
      if (width > limitWidth) {
        width = limitWidth;
      }
    }
    if (maxWidth != null && width > maxWidth) {
      width = maxWidth;
    }
    if (maxHeight != null && height > maxHeight) {
      height = maxHeight;
    }
    if (minWidth != null && width < minWidth) {
      width = minWidth;
    }
    if (minHeight != null && height < minHeight) {
      height = minHeight;
    }
    return {
      height: height + 'px',
      width: width + 'px',
    };
  };
}
