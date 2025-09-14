
export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Selection = Point[] | Rectangle | null;

export enum SelectionMode {
  Rectangle = 'rectangle',
  Polygon = 'polygon',
}

export interface Crop {
  id: string;
  imageDataUrl: string;
  thumbnailUrl: string;
  metadata: {
    originalFileName: string;
    cropNumber: number;
    mode: SelectionMode;
    selection: Selection;
  };
}
