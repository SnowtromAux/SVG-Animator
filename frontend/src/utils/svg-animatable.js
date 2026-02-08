// Tags we do NOT want to show as selectable/animatable nodes.
export const EXCLUDED_TAGS = new Set([
  'defs',
  'style',
  'script',
  'metadata',
  'title',
  'desc',
  'symbol',
  'clipPath',
  'mask',
  'pattern',
  'linearGradient',
  'radialGradient',
  'filter',
  'feGaussianBlur',
  'feOffset',
  'feBlend',
  'feColorMatrix',
  'feComponentTransfer',
  'feFuncR',
  'feFuncG',
  'feFuncB',
  'feFuncA',
  'marker'
]);

// Tags that we treat as animatable/selectable nodes.
const ANIMATABLE_TAGS = new Set([
  'g',
  'rect',
  'circle',
  'ellipse',
  'line',
  'path',
  'polygon',
  'polyline',
  'text',
  'image',
  'use'
]);

function hasAnyUsefulAttribute(el) {
  if (!el || !el.getAttribute) return false;

  const id = el.getAttribute('id');
  const cls = el.getAttribute('class');
  if (id || cls) return true;

  const candidates = [
    'opacity',
    'transform',
    'fill',
    'stroke',
    'stroke-width',
    'x',
    'y',
    'cx',
    'cy',
    'r',
    'rx',
    'ry',
    'width',
    'height',
    'd',
    'points'
  ];

  return candidates.some((attr) => el.hasAttribute(attr));
}

/**
 * Returns true if a node should appear as an animatable element in the tree.
 * - excludes technical tags in EXCLUDED_TAGS
 * - excludes <svg> itself (we animate inner nodes)
 * - includes shapes + groups
 * - for <g>, we show it if it has children OR has useful attributes (opacity/transform/id/class)
 */
export function isAnimatableNode(node) {
  if (!node || !node.tagName) return false;

  const tag = node.tagName.toLowerCase();

  if (tag === 'svg') return false;
  if (EXCLUDED_TAGS.has(tag)) return false;

  if (!ANIMATABLE_TAGS.has(tag)) return false;

  if (tag === 'g') {
    const hasChildren = node.children && node.children.length > 0;
    return hasChildren || hasAnyUsefulAttribute(node);
  }

  return true;
}
