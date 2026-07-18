interface DataInfo {
  containerSize: {
    width: number;
    height: number;
  };
  scrollSize: {
    width: number;
    height: number;
  };
  thumbSize: {
    x: number;
    y: number;
  };
  thumbVisible: {
    x: boolean;
    y: boolean;
  };
  position: {
    x: number;
    y: number;
  };
  percentage: {
    x: number;
    y: number;
  };
}

export type { DataInfo };
