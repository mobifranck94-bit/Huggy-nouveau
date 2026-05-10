/**
 * Component Palette - Drag & drop components into canvas
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Square, Type, Image, Layout, Box, MousePointer, 
  CreditCard, FileInput, AlignLeft, Heading1, Search,
  Layers, Grid, List as ListIcon
} from 'lucide-react';

export interface ComponentTemplate {
  id: string;
  name: string;
  category: 'Layout' | 'Typography' | 'Forms' | 'Display' | 'Navigation';
  icon: React.ComponentType<{ className?: string }>;
  // JSX template to insert
  template: {
    type: 'element';
    tagName: string;
    props: Record<string, any>;
    children: any[];
  };
}

const TEMPLATES: ComponentTemplate[] = [
  // Layout
  {
    id: 'div',
    name: 'Container',
    category: 'Layout',
    icon: Box,
    template: {
      type: 'element',
      tagName: 'div',
      props: { className: 'p-4 rounded-lg bg-zinc-50' },
      children: [],
    },
  },
  {
    id: 'flex',
    name: 'Flex Row',
    category: 'Layout',
    icon: Layout,
    template: {
      type: 'element',
      tagName: 'div',
      props: { className: 'flex items-center gap-4 p-4' },
      children: [],
    },
  },
  {
    id: 'grid',
    name: 'Grid',
    category: 'Layout',
    icon: Grid,
    template: {
      type: 'element',
      tagName: 'div',
      props: { className: 'grid grid-cols-3 gap-4 p-4' },
      children: [],
    },
  },
  {
    id: 'section',
    name: 'Section',
    category: 'Layout',
    icon: Layers,
    template: {
      type: 'element',
      tagName: 'section',
      props: { className: 'py-12 px-6' },
      children: [],
    },
  },

  // Typography
  {
    id: 'h1',
    name: 'Heading 1',
    category: 'Typography',
    icon: Heading1,
    template: {
      type: 'element',
      tagName: 'h1',
      props: { className: 'text-4xl font-bold tracking-tight' },
      children: [{ type: 'text', text: 'Heading', props: {}, children: [] }],
    },
  },
  {
    id: 'h2',
    name: 'Heading 2',
    category: 'Typography',
    icon: Type,
    template: {
      type: 'element',
      tagName: 'h2',
      props: { className: 'text-2xl font-semibold' },
      children: [{ type: 'text', text: 'Subheading', props: {}, children: [] }],
    },
  },
  {
    id: 'p',
    name: 'Paragraph',
    category: 'Typography',
    icon: AlignLeft,
    template: {
      type: 'element',
      tagName: 'p',
      props: { className: 'text-base text-zinc-600' },
      children: [{ type: 'text', text: 'Lorem ipsum dolor sit amet.', props: {}, children: [] }],
    },
  },

  // Forms
  {
    id: 'button',
    name: 'Button',
    category: 'Forms',
    icon: MousePointer,
    template: {
      type: 'element',
      tagName: 'button',
      props: { className: 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700' },
      children: [{ type: 'text', text: 'Click me', props: {}, children: [] }],
    },
  },
  {
    id: 'input',
    name: 'Input',
    category: 'Forms',
    icon: FileInput,
    template: {
      type: 'element',
      tagName: 'input',
      props: { 
        className: 'w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
        placeholder: 'Enter text...',
        type: 'text',
      },
      children: [],
    },
  },
  {
    id: 'search',
    name: 'Search Input',
    category: 'Forms',
    icon: Search,
    template: {
      type: 'element',
      tagName: 'input',
      props: { 
        className: 'w-full px-4 py-2 pl-10 border border-zinc-300 rounded-full',
        placeholder: 'Search...',
        type: 'search',
      },
      children: [],
    },
  },

  // Display
  {
    id: 'card',
    name: 'Card',
    category: 'Display',
    icon: CreditCard,
    template: {
      type: 'element',
      tagName: 'div',
      props: { className: 'p-6 rounded-xl bg-white border border-zinc-200 shadow-sm' },
      children: [
        {
          type: 'element',
          tagName: 'h3',
          props: { className: 'text-lg font-semibold mb-2' },
          children: [{ type: 'text', text: 'Card Title', props: {}, children: [] }],
        },
        {
          type: 'element',
          tagName: 'p',
          props: { className: 'text-zinc-600' },
          children: [{ type: 'text', text: 'Card description text here.', props: {}, children: [] }],
        },
      ],
    },
  },
  {
    id: 'image',
    name: 'Image',
    category: 'Display',
    icon: Image,
    template: {
      type: 'element',
      tagName: 'img',
      props: { 
        className: 'w-full h-48 object-cover rounded-lg',
        src: 'https://via.placeholder.com/400x200',
        alt: 'Image',
      },
      children: [],
    },
  },
  {
    id: 'badge',
    name: 'Badge',
    category: 'Display',
    icon: Square,
    template: {
      type: 'element',
      tagName: 'span',
      props: { className: 'px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700' },
      children: [{ type: 'text', text: 'Badge', props: {}, children: [] }],
    },
  },
  {
    id: 'list',
    name: 'List',
    category: 'Display',
    icon: ListIcon,
    template: {
      type: 'element',
      tagName: 'ul',
      props: { className: 'space-y-2 list-disc list-inside' },
      children: [
        {
          type: 'element',
          tagName: 'li',
          props: {},
          children: [{ type: 'text', text: 'Item 1', props: {}, children: [] }],
        },
        {
          type: 'element',
          tagName: 'li',
          props: {},
          children: [{ type: 'text', text: 'Item 2', props: {}, children: [] }],
        },
      ],
    },
  },
];

const CATEGORIES = ['Layout', 'Typography', 'Forms', 'Display', 'Navigation'] as const;

interface ComponentPaletteProps {
  onDragStart?: (template: ComponentTemplate) => void;
  onSelect?: (template: ComponentTemplate) => void;
}

export function ComponentPalette({ onDragStart, onSelect }: ComponentPaletteProps) {
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>('Layout');
  const [search, setSearch] = useState('');

  const filtered = TEMPLATES.filter(t => {
    if (search) {
      return t.name.toLowerCase().includes(search.toLowerCase());
    }
    return t.category === activeCategory;
  });

  return (
    <div className="w-64 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
          Components
        </h3>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-md text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Categories */}
      {!search && (
        <div className="flex flex-wrap gap-1 p-2 border-b border-zinc-800">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
                activeCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Components */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map((template, i) => {
          const Icon = template.icon;
          return (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              draggable
              onDragStart={(e: any) => {
                e.dataTransfer.setData('component', JSON.stringify(template.template));
                e.dataTransfer.effectAllowed = 'copy';
                onDragStart?.(template);
              }}
              onClick={() => onSelect?.(template)}
              className="flex items-center gap-2 px-2 py-2 rounded-md bg-zinc-800/50 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 cursor-grab active:cursor-grabbing transition-all group"
            >
              <div className="w-7 h-7 rounded bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-blue-400 transition-colors">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs text-zinc-200 font-medium">{template.name}</span>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-zinc-500 text-xs">
            No components found
          </div>
        )}
      </div>
    </div>
  );
}

export default ComponentPalette;
export { TEMPLATES };
