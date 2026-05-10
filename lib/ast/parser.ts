/**
 * AST Parser - Convertit JSX en arbre éditable visuellement
 */

import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import * as t from '@babel/types';

// @ts-ignore - traverse default export issue with ESM
const traverse = (_traverse as any).default || _traverse;

export interface VisualNode {
  id: string;
  type: 'element' | 'text' | 'fragment';
  tagName?: string;
  text?: string;
  props: Record<string, any>;
  children: VisualNode[];
  parent?: string;
  // Source location for AST mapping
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  // Original AST node reference (for round-trip)
  astPath?: string;
}

export interface ParsedComponent {
  name: string;
  tree: VisualNode;
  imports: Array<{ source: string; specifiers: string[] }>;
  exports: string[];
  raw: string;
}

let nodeIdCounter = 0;
const generateNodeId = () => `node-${Date.now()}-${++nodeIdCounter}`;

/**
 * Parse a TSX/JSX file into a visual tree
 */
export function parseComponent(code: string, fileName = 'Component.tsx'): ParsedComponent {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
    errorRecovery: true,
  });

  const imports: Array<{ source: string; specifiers: string[] }> = [];
  const exports: string[] = [];
  let rootJSX: any = null;
  let componentName = 'Component';

  traverse(ast, {
    ImportDeclaration(path: any) {
      imports.push({
        source: path.node.source.value,
        specifiers: path.node.specifiers.map((s: any) => s.local.name),
      });
    },
    ExportDefaultDeclaration(path: any) {
      const decl = path.node.declaration;
      if (t.isFunctionDeclaration(decl) && decl.id) {
        componentName = decl.id.name;
        exports.push(decl.id.name);
      }
    },
    FunctionDeclaration(path: any) {
      if (path.node.id) {
        const name = path.node.id.name;
        if (name[0] === name[0].toUpperCase()) {
          // Find return JSX
          path.traverse({
            ReturnStatement(returnPath: any) {
              if (returnPath.node.argument && !rootJSX) {
                if (
                  t.isJSXElement(returnPath.node.argument) ||
                  t.isJSXFragment(returnPath.node.argument)
                ) {
                  rootJSX = returnPath.node.argument;
                  componentName = name;
                }
              }
            },
          });
        }
      }
    },
    ArrowFunctionExpression(path: any) {
      if (
        t.isVariableDeclarator(path.parent) &&
        t.isIdentifier(path.parent.id)
      ) {
        const name = path.parent.id.name;
        if (name[0] === name[0].toUpperCase() && !rootJSX) {
          if (t.isJSXElement(path.node.body) || t.isJSXFragment(path.node.body)) {
            rootJSX = path.node.body;
            componentName = name;
          } else if (t.isBlockStatement(path.node.body)) {
            path.traverse({
              ReturnStatement(returnPath: any) {
                if (returnPath.node.argument && !rootJSX) {
                  if (
                    t.isJSXElement(returnPath.node.argument) ||
                    t.isJSXFragment(returnPath.node.argument)
                  ) {
                    rootJSX = returnPath.node.argument;
                    componentName = name;
                  }
                }
              },
            });
          }
        }
      }
    },
  });

  const tree = rootJSX 
    ? jsxToVisualNode(rootJSX) 
    : createEmptyNode();

  return {
    name: componentName,
    tree,
    imports,
    exports,
    raw: code,
  };
}

/**
 * Convert JSX AST node to VisualNode
 */
function jsxToVisualNode(node: any, parentId?: string): VisualNode {
  const id = generateNodeId();

  if (t.isJSXFragment(node)) {
    return {
      id,
      type: 'fragment',
      props: {},
      children: node.children
        .map((child: any) => jsxChildToVisualNode(child, id))
        .filter(Boolean) as VisualNode[],
      parent: parentId,
      loc: node.loc as any,
    };
  }

  if (t.isJSXElement(node)) {
    const opening = node.openingElement;
    const tagName = getJSXName(opening.name);
    const props: Record<string, any> = {};

    // Extract attributes
    opening.attributes.forEach((attr: any) => {
      if (t.isJSXAttribute(attr)) {
        const name = t.isJSXIdentifier(attr.name) ? attr.name.name : '';
        if (!attr.value) {
          props[name] = true;
        } else if (t.isStringLiteral(attr.value)) {
          props[name] = attr.value.value;
        } else if (t.isJSXExpressionContainer(attr.value)) {
          props[name] = extractExpression(attr.value.expression);
        }
      }
    });

    return {
      id,
      type: 'element',
      tagName,
      props,
      children: node.children
        .map((child: any) => jsxChildToVisualNode(child, id))
        .filter(Boolean) as VisualNode[],
      parent: parentId,
      loc: node.loc as any,
    };
  }

  return createEmptyNode();
}

/**
 * Convert JSX child to visual node (handles text, expressions, elements)
 */
function jsxChildToVisualNode(child: any, parentId: string): VisualNode | null {
  if (t.isJSXText(child)) {
    const text = child.value.trim();
    if (!text) return null;
    return {
      id: generateNodeId(),
      type: 'text',
      text,
      props: {},
      children: [],
      parent: parentId,
    };
  }

  if (t.isJSXElement(child) || t.isJSXFragment(child)) {
    return jsxToVisualNode(child, parentId);
  }

  if (t.isJSXExpressionContainer(child)) {
    const expr = child.expression;
    if (t.isStringLiteral(expr)) {
      return {
        id: generateNodeId(),
        type: 'text',
        text: expr.value,
        props: {},
        children: [],
        parent: parentId,
      };
    }
    // Dynamic expression - mark as text with placeholder
    return {
      id: generateNodeId(),
      type: 'text',
      text: `{${extractExpression(expr)}}`,
      props: { dynamic: true },
      children: [],
      parent: parentId,
    };
  }

  return null;
}

/**
 * Get JSX element name (handles namespaced + member expressions)
 */
function getJSXName(name: any): string {
  if (t.isJSXIdentifier(name)) return name.name;
  if (t.isJSXMemberExpression(name)) {
    return `${getJSXName(name.object)}.${getJSXName(name.property)}`;
  }
  if (t.isJSXNamespacedName(name)) {
    return `${name.namespace.name}:${name.name.name}`;
  }
  return 'unknown';
}

/**
 * Extract simple expression to string representation
 */
function extractExpression(expr: any): any {
  if (t.isStringLiteral(expr)) return expr.value;
  if (t.isNumericLiteral(expr)) return expr.value;
  if (t.isBooleanLiteral(expr)) return expr.value;
  if (t.isNullLiteral(expr)) return null;
  if (t.isIdentifier(expr)) return `{${expr.name}}`;
  if (t.isTemplateLiteral(expr)) {
    return expr.quasis.map((q: any) => q.value.raw).join('${...}');
  }
  return '{...}';
}

/**
 * Create empty fragment node
 */
function createEmptyNode(): VisualNode {
  return {
    id: generateNodeId(),
    type: 'fragment',
    props: {},
    children: [],
  };
}

/**
 * Find node by ID in tree
 */
export function findNodeById(tree: VisualNode, id: string): VisualNode | null {
  if (tree.id === id) return tree;
  for (const child of tree.children) {
    const found = findNodeById(child, id);
    if (found) return found;
  }
  return null;
}

/**
 * Get all nodes flattened
 */
export function flattenTree(tree: VisualNode): VisualNode[] {
  const result: VisualNode[] = [tree];
  for (const child of tree.children) {
    result.push(...flattenTree(child));
  }
  return result;
}
