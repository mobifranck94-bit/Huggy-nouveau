/**
 * AST Generator - Convertit VisualNode en code JSX
 */

import type { VisualNode } from './parser';

const SELF_CLOSING_TAGS = new Set([
  'img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed',
  'source', 'track', 'wbr',
]);

/**
 * Generate JSX code from VisualNode tree
 */
export function generateJSX(node: VisualNode, indent = 0): string {
  const pad = '  '.repeat(indent);

  if (node.type === 'text') {
    return `${pad}${node.text}`;
  }

  if (node.type === 'fragment') {
    if (node.children.length === 0) return `${pad}<></>`;
    const children = node.children
      .map(c => generateJSX(c, indent + 1))
      .join('\n');
    return `${pad}<>\n${children}\n${pad}</>`;
  }

  if (node.type === 'element' && node.tagName) {
    const propsStr = generateProps(node.props);
    const isSelfClosing = SELF_CLOSING_TAGS.has(node.tagName.toLowerCase());

    if (node.children.length === 0 || isSelfClosing) {
      return `${pad}<${node.tagName}${propsStr ? ' ' + propsStr : ''} />`;
    }

    // Single text child - keep inline
    if (node.children.length === 1 && node.children[0].type === 'text') {
      return `${pad}<${node.tagName}${propsStr ? ' ' + propsStr : ''}>${node.children[0].text}</${node.tagName}>`;
    }

    const children = node.children
      .map(c => generateJSX(c, indent + 1))
      .join('\n');
    return `${pad}<${node.tagName}${propsStr ? ' ' + propsStr : ''}>\n${children}\n${pad}</${node.tagName}>`;
  }

  return '';
}

/**
 * Generate JSX props string
 */
function generateProps(props: Record<string, any>): string {
  return Object.entries(props)
    .filter(([key]) => key !== 'dynamic')
    .map(([key, value]) => {
      if (value === true) return key;
      if (value === false) return `${key}={false}`;
      if (typeof value === 'string') {
        // Check if it's a dynamic expression
        if (value.startsWith('{') && value.endsWith('}')) {
          return `${key}=${value}`;
        }
        return `${key}="${value.replace(/"/g, '&quot;')}"`;
      }
      if (typeof value === 'number') return `${key}={${value}}`;
      if (value === null) return `${key}={null}`;
      return `${key}={${JSON.stringify(value)}}`;
    })
    .join(' ');
}

/**
 * Generate full component file from tree + imports
 */
export function generateComponent(
  componentName: string,
  tree: VisualNode,
  imports: Array<{ source: string; specifiers: string[] }>
): string {
  const importsCode = imports
    .map(imp => {
      if (imp.specifiers.length === 1 && imp.specifiers[0] === 'default') {
        return `import ${imp.specifiers[0]} from '${imp.source}';`;
      }
      return `import { ${imp.specifiers.join(', ')} } from '${imp.source}';`;
    })
    .join('\n');

  const jsxCode = generateJSX(tree, 2);

  return `${importsCode}

export default function ${componentName}() {
  return (
${jsxCode}
  );
}
`;
}
