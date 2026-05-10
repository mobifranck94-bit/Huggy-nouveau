/**
 * AST Manipulator - Opérations sur l'arbre visuel (add/remove/update)
 */

import type { VisualNode } from './parser';

/**
 * Update node properties immutably
 */
export function updateNode(
  tree: VisualNode,
  nodeId: string,
  updates: Partial<VisualNode>
): VisualNode {
  if (tree.id === nodeId) {
    return { ...tree, ...updates };
  }
  return {
    ...tree,
    children: tree.children.map(child => updateNode(child, nodeId, updates)),
  };
}

/**
 * Update specific prop on node
 */
export function updateNodeProp(
  tree: VisualNode,
  nodeId: string,
  propName: string,
  propValue: any
): VisualNode {
  if (tree.id === nodeId) {
    return {
      ...tree,
      props: { ...tree.props, [propName]: propValue },
    };
  }
  return {
    ...tree,
    children: tree.children.map(child =>
      updateNodeProp(child, nodeId, propName, propValue)
    ),
  };
}

/**
 * Update text content of a text node
 */
export function updateNodeText(
  tree: VisualNode,
  nodeId: string,
  text: string
): VisualNode {
  if (tree.id === nodeId) {
    return { ...tree, text };
  }
  return {
    ...tree,
    children: tree.children.map(child => updateNodeText(child, nodeId, text)),
  };
}

/**
 * Add child to a node
 */
export function addChild(
  tree: VisualNode,
  parentId: string,
  newChild: VisualNode,
  index?: number
): VisualNode {
  if (tree.id === parentId) {
    const children = [...tree.children];
    if (typeof index === 'number') {
      children.splice(index, 0, { ...newChild, parent: parentId });
    } else {
      children.push({ ...newChild, parent: parentId });
    }
    return { ...tree, children };
  }
  return {
    ...tree,
    children: tree.children.map(child => addChild(child, parentId, newChild, index)),
  };
}

/**
 * Remove a node
 */
export function removeNode(tree: VisualNode, nodeId: string): VisualNode {
  return {
    ...tree,
    children: tree.children
      .filter(child => child.id !== nodeId)
      .map(child => removeNode(child, nodeId)),
  };
}

/**
 * Move node to new parent at index
 */
export function moveNode(
  tree: VisualNode,
  nodeId: string,
  newParentId: string,
  index: number
): VisualNode {
  // Find node first
  const node = findNodeRecursive(tree, nodeId);
  if (!node) return tree;

  // Remove from old position
  const treeWithoutNode = removeNode(tree, nodeId);

  // Add to new position
  return addChild(treeWithoutNode, newParentId, node, index);
}

function findNodeRecursive(tree: VisualNode, nodeId: string): VisualNode | null {
  if (tree.id === nodeId) return tree;
  for (const child of tree.children) {
    const found = findNodeRecursive(child, nodeId);
    if (found) return found;
  }
  return null;
}

/**
 * Duplicate a node
 */
export function duplicateNode(tree: VisualNode, nodeId: string): VisualNode {
  const node = findNodeRecursive(tree, nodeId);
  if (!node || !node.parent) return tree;

  const cloned = cloneNodeWithNewIds(node);
  return addChild(tree, node.parent, cloned);
}

function cloneNodeWithNewIds(node: VisualNode): VisualNode {
  return {
    ...node,
    id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    children: node.children.map(cloneNodeWithNewIds),
  };
}

/**
 * Get path from root to node (for breadcrumbs)
 */
export function getNodePath(tree: VisualNode, nodeId: string): VisualNode[] {
  if (tree.id === nodeId) return [tree];

  for (const child of tree.children) {
    const path = getNodePath(child, nodeId);
    if (path.length > 0) return [tree, ...path];
  }

  return [];
}

/**
 * Update className utility (for Tailwind editing)
 */
export function updateClassName(
  tree: VisualNode,
  nodeId: string,
  className: string
): VisualNode {
  return updateNodeProp(tree, nodeId, 'className', className);
}

/**
 * Toggle Tailwind class
 */
export function toggleTailwindClass(
  tree: VisualNode,
  nodeId: string,
  className: string
): VisualNode {
  const node = findNodeRecursive(tree, nodeId);
  if (!node) return tree;

  const current = (node.props.className || '') as string;
  const classes = current.split(' ').filter(Boolean);
  const index = classes.indexOf(className);

  if (index > -1) {
    classes.splice(index, 1);
  } else {
    classes.push(className);
  }

  return updateClassName(tree, nodeId, classes.join(' '));
}
