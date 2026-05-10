/**
 * Visual Canvas - Render visual tree with click-to-select
 */

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import type { VisualNode } from '../../../lib/ast/parser';

interface VisualCanvasProps {
  tree: VisualNode | null;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onDropComponent: (parentId: string, template: any) => void;
  device?: 'desktop' | 'tablet' | 'mobile';
}

export function VisualCanvas({
  tree,
  selectedNodeId,
  onSelectNode,
  onDropComponent,
  device = 'desktop',
}: VisualCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const widths = {
    desktop: 'max-w-full',
    tablet: 'max-w-2xl',
    mobile: 'max-w-sm',
  };

  return (
    <div className="flex-1 h-full bg-zinc-950 overflow-auto p-8">
      <div className={`mx-auto ${widths[device]} bg-white rounded-lg shadow-2xl min-h-[600px] relative`}>
        <div
          ref={canvasRef}
          onClick={(e) => {
            if (e.target === canvasRef.current) {
              onSelectNode(null);
            }
          }}
          className="p-6 min-h-[600px]"
        >
          {tree ? (
            <NodeRenderer
              node={tree}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              onDropComponent={onDropComponent}
              isRoot
            />
          ) : (
            <EmptyCanvas />
          )}
        </div>
      </div>
    </div>
  );
}

interface NodeRendererProps {
  node: VisualNode;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onDropComponent: (parentId: string, template: any) => void;
  isRoot?: boolean;
}

function NodeRenderer({ node, selectedNodeId, onSelectNode, onDropComponent, isRoot }: NodeRendererProps) {
  const isSelected = selectedNodeId === node.id;

  if (node.type === 'text') {
    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          onSelectNode(node.id);
        }}
        className={`cursor-pointer transition-all ${
          isSelected ? 'outline outline-2 outline-blue-500 outline-offset-1 bg-blue-50/50' : 'hover:outline hover:outline-1 hover:outline-blue-300'
        }`}
      >
        {node.text}
      </span>
    );
  }

  if (node.type === 'fragment') {
    return (
      <>
        {node.children.map(child => (
          <NodeRenderer
            key={child.id}
            node={child}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            onDropComponent={onDropComponent}
          />
        ))}
      </>
    );
  }

  if (node.type === 'element' && node.tagName) {
    const Tag = node.tagName as any;
    const isVoid = ['img', 'br', 'hr', 'input', 'meta', 'link'].includes(node.tagName.toLowerCase());

    const props = {
      ...sanitizeProps(node.props),
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelectNode(node.id);
      },
      onDragOver: (e: React.DragEvent) => {
        if (!isVoid) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      onDrop: (e: React.DragEvent) => {
        if (isVoid) return;
        e.preventDefault();
        e.stopPropagation();
        const data = e.dataTransfer.getData('component');
        if (data) {
          try {
            const template = JSON.parse(data);
            onDropComponent(node.id, template);
          } catch (err) {
            console.error('Invalid drop data', err);
          }
        }
      },
      'data-node-id': node.id,
      className: combineClassNames(
        node.props.className as string,
        isSelected ? 'outline outline-2 outline-blue-500 outline-offset-1' : 'hover:outline hover:outline-1 hover:outline-blue-300'
      ),
      style: {
        ...((node.props.style as object) || {}),
        cursor: 'pointer',
      },
    };

    if (isVoid) {
      return <Tag {...props} />;
    }

    return (
      <Tag {...props}>
        {node.children.length === 0 && !isVoid ? (
          <EmptyDropZone />
        ) : (
          node.children.map(child => (
            <NodeRenderer
              key={child.id}
              node={child}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              onDropComponent={onDropComponent}
            />
          ))
        )}
      </Tag>
    );
  }

  return null;
}

function sanitizeProps(props: Record<string, any>): Record<string, any> {
  const safe: Record<string, any> = {};
  for (const [key, value] of Object.entries(props)) {
    if (key === 'dynamic') continue;
    // Skip event handlers from source code (would be undefined here)
    if (key.startsWith('on') && typeof value === 'string') continue;
    // Convert dynamic expressions to strings
    if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

function combineClassNames(base: string | undefined, extra: string): string {
  return [base, extra].filter(Boolean).join(' ');
}

function EmptyDropZone() {
  return (
    <div className="text-xs text-zinc-400 italic py-2 px-3 border border-dashed border-zinc-300 rounded text-center">
      Drop components here
    </div>
  );
}

function EmptyCanvas() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center h-[500px] text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-4">
        <span className="text-3xl">🎨</span>
      </div>
      <h3 className="text-xl font-bold text-zinc-800 mb-2">Visual Canvas</h3>
      <p className="text-sm text-zinc-500 max-w-md">
        Drag components from the palette to start building visually, or generate code with AI first.
      </p>
    </motion.div>
  );
}

export default VisualCanvas;
