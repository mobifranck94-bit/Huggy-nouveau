/**
 * Property Panel - Edit selected element properties
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Copy, ChevronDown, ChevronRight, Palette, Type as TypeIcon, Box, Layout } from 'lucide-react';
import type { VisualNode } from '../../../lib/ast/parser';

interface PropertyPanelProps {
  selectedNode: VisualNode | null;
  onUpdateProp: (nodeId: string, propName: string, value: any) => void;
  onUpdateText: (nodeId: string, text: string) => void;
  onDelete: (nodeId: string) => void;
  onDuplicate: (nodeId: string) => void;
}

const TAILWIND_COLORS = [
  'bg-white', 'bg-zinc-50', 'bg-zinc-100', 'bg-zinc-900',
  'bg-blue-500', 'bg-blue-600', 'bg-red-500', 'bg-green-500',
  'bg-yellow-500', 'bg-purple-500', 'bg-pink-500',
];

const TEXT_SIZES = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl'];
const FONT_WEIGHTS = ['font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold'];
const PADDING_VALUES = ['p-0', 'p-1', 'p-2', 'p-3', 'p-4', 'p-6', 'p-8', 'p-12'];
const ROUNDED_VALUES = ['rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full'];

export function PropertyPanel({
  selectedNode,
  onUpdateProp,
  onUpdateText,
  onDelete,
  onDuplicate,
}: PropertyPanelProps) {
  const [openSections, setOpenSections] = useState({
    content: true,
    style: true,
    layout: true,
    advanced: false,
  });

  if (!selectedNode) {
    return (
      <div className="w-72 h-full bg-zinc-900 border-l border-zinc-800 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-zinc-800 flex items-center justify-center">
            <Box className="w-5 h-5 text-zinc-500" />
          </div>
          <p className="text-xs text-zinc-500">Select an element to edit its properties</p>
        </div>
      </div>
    );
  }

  const className = (selectedNode.props.className || '') as string;
  const classes = className.split(' ').filter(Boolean);

  const toggleClass = (cls: string, prefix: string) => {
    const filtered = classes.filter(c => !c.startsWith(prefix));
    filtered.push(cls);
    onUpdateProp(selectedNode.id, 'className', filtered.join(' '));
  };

  const removeClass = (cls: string) => {
    const filtered = classes.filter(c => c !== cls);
    onUpdateProp(selectedNode.id, 'className', filtered.join(' '));
  };

  const Section = ({ id, title, icon: Icon, children }: any) => (
    <div className="border-b border-zinc-800">
      <button
        onClick={() => setOpenSections(prev => ({ ...prev, [id]: !prev[id as keyof typeof prev] }))}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">{title}</span>
        </div>
        {openSections[id as keyof typeof openSections] 
          ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
          : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
        }
      </button>
      {openSections[id as keyof typeof openSections] && (
        <div className="px-3 pb-3 space-y-3">{children}</div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-72 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="p-3 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Properties
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDuplicate(selectedNode.id)}
              className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(selectedNode.id)}
              className="p-1.5 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-[10px] font-mono bg-blue-500/20 text-blue-400 rounded">
            {selectedNode.type === 'element' ? `<${selectedNode.tagName}>` : selectedNode.type}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Content */}
        {(selectedNode.type === 'text' || selectedNode.children?.[0]?.type === 'text') && (
          <Section id="content" title="Content" icon={TypeIcon}>
            {selectedNode.type === 'text' ? (
              <textarea
                value={selectedNode.text || ''}
                onChange={(e) => onUpdateText(selectedNode.id, e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus:border-blue-500 resize-none"
                rows={3}
              />
            ) : selectedNode.children?.[0]?.type === 'text' ? (
              <textarea
                value={selectedNode.children[0].text || ''}
                onChange={(e) => onUpdateText(selectedNode.children[0].id, e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus:border-blue-500 resize-none"
                rows={3}
              />
            ) : null}
          </Section>
        )}

        {/* Style */}
        {selectedNode.type === 'element' && (
          <>
            <Section id="style" title="Appearance" icon={Palette}>
              {/* Background */}
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Background
                </label>
                <div className="grid grid-cols-6 gap-1">
                  {TAILWIND_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => toggleClass(color, 'bg-')}
                      className={`w-7 h-7 rounded ${color} border border-zinc-700 hover:scale-110 transition-transform ${
                        classes.includes(color) ? 'ring-2 ring-blue-500' : ''
                      }`}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Text Size */}
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Text Size
                </label>
                <select
                  value={classes.find(c => TEXT_SIZES.includes(c)) || ''}
                  onChange={(e) => e.target.value && toggleClass(e.target.value, 'text-')}
                  className="w-full px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Default</option>
                  {TEXT_SIZES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Font Weight */}
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Font Weight
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {FONT_WEIGHTS.map(w => (
                    <button
                      key={w}
                      onClick={() => toggleClass(w, 'font-')}
                      className={`px-2 py-1 text-[10px] rounded border ${
                        classes.includes(w)
                          ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {w.replace('font-', '')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Border Radius */}
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Border Radius
                </label>
                <select
                  value={classes.find(c => ROUNDED_VALUES.includes(c)) || ''}
                  onChange={(e) => e.target.value && toggleClass(e.target.value, 'rounded')}
                  className="w-full px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">None</option>
                  {ROUNDED_VALUES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </Section>

            <Section id="layout" title="Layout" icon={Layout}>
              {/* Padding */}
              <div>
                <label className="block text-[10px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Padding
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {PADDING_VALUES.map(p => (
                    <button
                      key={p}
                      onClick={() => toggleClass(p, 'p-')}
                      className={`px-2 py-1 text-[10px] rounded border ${
                        classes.includes(p)
                          ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {p.replace('p-', '')}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            <Section id="advanced" title="ClassName" icon={Box}>
              <textarea
                value={className}
                onChange={(e) => onUpdateProp(selectedNode.id, 'className', e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded text-zinc-200 font-mono focus:outline-none focus:border-blue-500 resize-none"
                rows={4}
                placeholder="e.g., flex items-center gap-4..."
              />
              {classes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {classes.map((cls, i) => (
                    <button
                      key={i}
                      onClick={() => removeClass(cls)}
                      className="px-1.5 py-0.5 text-[10px] bg-zinc-800 border border-zinc-700 rounded text-zinc-300 hover:bg-red-500/20 hover:border-red-500 hover:text-red-300 transition-colors"
                      title="Click to remove"
                    >
                      {cls} ×
                    </button>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default PropertyPanel;
