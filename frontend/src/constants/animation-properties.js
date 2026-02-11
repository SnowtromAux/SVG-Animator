export const ANIMATION_PROPERTIES = {
  // ---- Shapes ----
  rect: {
    label: 'Rect',
    properties: [
      { name: 'x', label: 'X', type: 'number', step: 1 },
      { name: 'y', label: 'Y', type: 'number', step: 1 },
      { name: 'width', label: 'Width', type: 'number', step: 1, min: 0 },
      { name: 'height', label: 'Height', type: 'number', step: 1, min: 0 },
      { name: 'rx', label: 'Radius X', type: 'number', step: 1, min: 0 },
      { name: 'ry', label: 'Radius Y', type: 'number', step: 1, min: 0 },

      { name: 'opacity', label: 'Opacity', type: 'number', step: 0.05, min: 0, max: 1 },
      { name: 'fill', label: 'Fill', type: 'color' },
      { name: 'stroke', label: 'Stroke', type: 'color' },
      { name: 'stroke-width', label: 'Stroke Width', type: 'number', step: 1, min: 0 }
    ]
  },

  circle: {
    label: 'Circle',
    properties: [
      { name: 'cx', label: 'Center X', type: 'number', step: 1 },
      { name: 'cy', label: 'Center Y', type: 'number', step: 1 },
      { name: 'r', label: 'Radius', type: 'number', step: 1, min: 0 },

      { name: 'opacity', label: 'Opacity', type: 'number', step: 0.05, min: 0, max: 1 },
      { name: 'fill', label: 'Fill', type: 'color' },
      { name: 'stroke', label: 'Stroke', type: 'color' },
      { name: 'stroke-width', label: 'Stroke Width', type: 'number', step: 1, min: 0 }
    ]
  },

  ellipse: {
    label: 'Ellipse',
    properties: [
      { name: 'cx', label: 'Center X', type: 'number', step: 1 },
      { name: 'cy', label: 'Center Y', type: 'number', step: 1 },
      { name: 'rx', label: 'Radius X', type: 'number', step: 1, min: 0 },
      { name: 'ry', label: 'Radius Y', type: 'number', step: 1, min: 0 },

      { name: 'opacity', label: 'Opacity', type: 'number', step: 0.05, min: 0, max: 1 },
      { name: 'fill', label: 'Fill', type: 'color' },
      { name: 'stroke', label: 'Stroke', type: 'color' },
      { name: 'stroke-width', label: 'Stroke Width', type: 'number', step: 1, min: 0 }
    ]
  },

  line: {
    label: 'Line',
    properties: [
      { name: 'x1', label: 'X1', type: 'number', step: 1 },
      { name: 'y1', label: 'Y1', type: 'number', step: 1 },
      { name: 'x2', label: 'X2', type: 'number', step: 1 },
      { name: 'y2', label: 'Y2', type: 'number', step: 1 },

      { name: 'opacity', label: 'Opacity', type: 'number', step: 0.05, min: 0, max: 1 },
      { name: 'stroke', label: 'Stroke', type: 'color' },
      { name: 'stroke-width', label: 'Stroke Width', type: 'number', step: 1, min: 0 }
    ]
  },

  polygon: {
    label: 'Polygon',
    properties: [

      { name: 'opacity', label: 'Opacity', type: 'number', step: 0.05, min: 0, max: 1 },
      { name: 'fill', label: 'Fill', type: 'color' },
      { name: 'stroke', label: 'Stroke', type: 'color' },
      { name: 'stroke-width', label: 'Stroke Width', type: 'number', step: 1, min: 0 }
    ]
  },

  polyline: {
    label: 'Polyline',
    properties: [

      { name: 'opacity', label: 'Opacity', type: 'number', step: 0.05, min: 0, max: 1 },
      { name: 'fill', label: 'Fill', type: 'color' },
      { name: 'stroke', label: 'Stroke', type: 'color' },
      { name: 'stroke-width', label: 'Stroke Width', type: 'number', step: 1, min: 0 }
    ]
  },

  path: {
    label: 'Path',
    properties: [
      // d НЕ може да е smooth (структурно) → махаме го

      { name: 'opacity', label: 'Opacity', type: 'number', step: 0.05, min: 0, max: 1 },
      { name: 'fill', label: 'Fill', type: 'color' },
      { name: 'stroke', label: 'Stroke', type: 'color' },
      { name: 'stroke-width', label: 'Stroke Width', type: 'number', step: 1, min: 0 }
    ]
  },

  text: {
    label: 'Text',
    properties: [
      { name: 'x', label: 'X', type: 'number', step: 1 },
      { name: 'y', label: 'Y', type: 'number', step: 1 },

      { name: 'opacity', label: 'Opacity', type: 'number', step: 0.05, min: 0, max: 1 },
      { name: 'fill', label: 'Fill', type: 'color' },

      { name: 'font-size', label: 'Font Size', type: 'number', step: 1, min: 1 }

      // text-anchor е дискретно (start/middle/end) → махаме го
    ]
  },

  image: {
    label: 'Image',
    properties: [
      { name: 'x', label: 'X', type: 'number', step: 1 },
      { name: 'y', label: 'Y', type: 'number', step: 1 },
      { name: 'width', label: 'Width', type: 'number', step: 1, min: 0 },
      { name: 'height', label: 'Height', type: 'number', step: 1, min: 0 },
      { name: 'opacity', label: 'Opacity', type: 'number', step: 0.05, min: 0, max: 1 }
    ]
  },

  // ---- Grouping ----
  g: {
    label: 'Group',
    properties: [
      { name: 'opacity', label: 'Opacity', type: 'number', step: 0.05, min: 0, max: 1 }
    ]
  },

  // ---- Fallback ----
  default: {
    label: 'Default',
    properties: [
      { name: 'opacity', label: 'Opacity', type: 'number', step: 0.05, min: 0, max: 1 },
      { name: 'fill', label: 'Fill', type: 'color' },
      { name: 'stroke', label: 'Stroke', type: 'color' },
      { name: 'stroke-width', label: 'Stroke Width', type: 'number', step: 1, min: 0 }
    ]
  }
};
