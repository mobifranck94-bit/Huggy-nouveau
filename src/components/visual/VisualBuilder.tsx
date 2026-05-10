/**
 * Visual Builder - Main visual editing interface
 * Combines Palette + Canvas + Property Panel
 */

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Tablet, Smartphone, Code, Eye, Undo, Redo } from 'lucide-react';
import { ComponentPalette } from './ComponentPalette';
import { VisualCanvas } from './VisualCanvas';
import { PropertyPanel } from './PropertyPanel';
import { parseComponent, findNodeById, type VisualNode } from '../../../lib/ast/parser';
import { generateComponent } from '../../../lib/ast/generator';
import {
  updateNodeProp,
  updateNodeText,
  addChild,
  removeNode,
  duplicateNode,
} from '../../../lib/ast/manipulator';

interface VisualBuilderProps {
  initialCode: string;
  fileName?: string;
  onCodeChange?: (newCode: string) => void;
  onClose?: () => void;
}

export function VisualBuilder({
  initialCode,
  fileName = 'App.tsx',
  onCodeChange,
  onClose,
}: VisualBuilderProps) {
  // Parse initial code into visual tree
  const initialParsed = useMemo(() => {
    try {
      return parseComponent(initialCode, fileName);
    } catch (err) {
      console.error('[VisualBuilder] Parse error:', err);
      return null;
    }
  }, [initialCode, fileName]);

  const [tree, setTree] = useState<VisualNode | null>(initialParsed?.tree || null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [history, setHistory] = useState<VisualNode[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [parseError, setParseError] = useState<string | null>(null);

  // Save snapshot for undo
  const pushHistory = (newTree: VisualNode) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newTree);
    setHistory(newHistory.slice(-50)); // Keep last 50
    setHistoryIndex(Math.min(newHistory.length - 1, 49));
  };

  // Update tree and emit code change
  const updateTree = (newTree: VisualNode) => {
    setTree(newTree);
    pushHistory(newTree);
    
    if (onCodeChange && initialParsed) {
      try {
        const newCode = generateComponent(
          initialParsed.name,
          newTree,
          initialParsed.imports
        );
        onCodeChange(newCode);
      } catch (err) {
        console.error('[VisualBuilder] Generate error:', err);
      }
    }
  };

  // Initialize history
  useEffect(() => {
    if (initialParsed?.tree && history.length === 0) {
      setHistory([initialParsed.tree]);
      setHistoryIndex(0);
    }
    if (!initialParsed) {
      setParseError('Could not parse component. Make sure it exports a default function returning JSX.');
    }
  }, [initialParsed]);

  const selectedNode = tree && selectedNodeId ? findNodeById(tree, selectedNodeId) : null;

  // Handlers
  const handleUpdateProp = (nodeId: string, propName: string, value: any) => {
    if (!tree) return;
    updateTree(updateNodeProp(tree, nodeId, propName, value));
  };

  const handleUpdateText = (nodeId: string, text: string) => {
    if (!tree) return;
    updateTree(updateNodeText(tree, nodeId, text));
  };

  const handleDelete = (nodeId: string) => {
    if (!tree) return;
    updateTree(removeNode(tree, nodeId));
    setSelectedNodeId(null);
  };

  const handleDuplicate = (nodeId: string) => {
    if (!tree) return;
    updateTree(duplicateNode(tree, nodeId));
  };

  const handleDropComponent = (parentId: string, template: any) => {
    if (!tree) return;
    const newNode: VisualNode = addIdsToTemplate(template);
    updateTree(addChild(tree, parentId, newNode));
    setSelectedNodeId(newNode.id);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setTree(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setTree(history[historyIndex + 1]);
    }
  };

  if (parseError) {
    return (
      <div className="w-full h-full bg-zinc-950 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <Code className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Cannot Parse Component</h3>
          <p className="text-sm text-zinc-400 mb-4">{parseError}</p>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Back to Code
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-zinc-950 flex flex-col">
      {/* Toolbar */}
      <div className="h-11 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-300">Visual Editor</span>
          <span className="text-xs text-zinc-500">·</span>
          <span className="text-xs text-zinc-500 font-mono">{fileName}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* History */}
          <div className="flex items-center gap-1 border-r border-zinc-800 pr-2">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Device */}
          <div className="flex items-center gap-1 bg-zinc-800 rounded-md p-0.5">
            {[
              { id: 'desktop', icon: Monitor },
              { id: 'tablet', icon: Tablet },
              { id: 'mobile', icon: Smartphone },
            ].map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setDevice(id as any)}
                className={`p-1.5 rounded transition-colors ${
                  device === id
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded flex items-center gap-1.5"
            >
              <Code className="w-3.5 h-3.5" />
              Code View
            </button>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        <ComponentPalette
          onDragStart={() => {}}
        />

        <VisualCanvas
          tree={tree}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          onDropComponent={handleDropComponent}
          device={device}
        />

        <PropertyPanel
          selectedNode={selectedNode}
          onUpdateProp={handleUpdateProp}
          onUpdateText={handleUpdateText}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
        />
      </div>
    </div>
  );
}

/**
 * Add unique IDs to template tree
 */
function addIdsToTemplate(template: any): VisualNode {
  const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    type: template.type,
    tagName: template.tagName,
    text: template.text,
    props: template.props || {},
    children: (template.children || []).map(addIdsToTemplate),
  };
}

export default VisualBuilder;
