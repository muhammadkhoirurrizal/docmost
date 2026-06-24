export interface ImageRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  pos: number; // ProseMirror position
}

export interface GuideLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: 'edge' | 'center' | 'page-center' | 'spacing' | 'size';
  orientation: 'vertical' | 'horizontal';
}

export interface SmartGuideOptions {
  edgeThreshold?: number;
  centerThreshold?: number;
  spacingThreshold?: number;
  lineColor?: number;
  lineWidth?: number;
  lineDash?: number;
}
