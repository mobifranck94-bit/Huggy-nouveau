'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Plus, Target, ArrowUp, ChevronDown, Zap } from 'lucide-react'

export type Theme = 'dark' | 'light'

interface AIChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showModelSelector?: boolean
  submitLabel?: string
  theme?: Theme
}

const models = [
  { id: 'sonnet-4.5', name: 'Sonnet 4.5', description: 'Fast & intelligent', icon: <Zap className="w-3.5 h-3.5 text-blue-500" /> },
  { id: 'opus-4.5', name: 'Opus 4.5', description: 'Most capable', icon: <Zap className="w-3.5 h-3.5 text-purple-500" /> },
  { id: 'haiku-4.5', name: 'Haiku 4.5', description: 'Lightning fast', icon: <Zap className="w-3.5 h-3.5 text-emerald-500" /> },
]

const themeStyles = {
  dark: {
    container: 'bg-[#161617] border-zinc-800/50',
    textarea: 'text-zinc-200 placeholder:text-zinc-500',
    button: 'text-zinc-500 hover:bg-zinc-800 border-zinc-800/80',
    modelButton: 'bg-zinc-800/50 border-zinc-700/30 text-zinc-400 hover:text-zinc-200',
    modelDropdown: 'bg-[#1a1a1b] border-zinc-700/50',
    modelItem: 'text-zinc-300 hover:bg-zinc-800/50',
    submitActive: 'bg-white text-zinc-900 hover:bg-zinc-200',
    submitDisabled: 'bg-zinc-800 text-zinc-500',
  },
  light: {
    container: 'bg-white border-zinc-200 shadow-zinc-200/50',
    textarea: 'text-zinc-800 placeholder:text-zinc-400',
    button: 'text-zinc-500 hover:bg-zinc-100 border-zinc-200',
    modelButton: 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900',
    modelDropdown: 'bg-white border-zinc-200 shadow-xl',
    modelItem: 'text-zinc-700 hover:bg-zinc-50',
    submitActive: 'bg-zinc-900 text-white hover:bg-zinc-800',
    submitDisabled: 'bg-zinc-200 text-zinc-400',
  }
}

export function AIChatInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Décris ton application...",
  disabled = false,
  className = "",
  showModelSelector = true,
  submitLabel = "Générer",
  theme = 'dark'
}: AIChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isModelOpen, setIsModelOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState(models[0])
  const styles = themeStyles[theme]

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !disabled) {
        onSubmit()
      }
    }
  }

  return (
    <div className={`rounded-2xl border shadow-lg flex flex-col relative transition-all duration-200 shrink-0 ${styles.container} ${className}`}>
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        className={`w-full bg-transparent border-none text-sm font-medium resize-none focus:outline-none mb-2 max-h-[160px] scrollbar-hide overflow-y-auto px-4 pt-4 ${styles.textarea}`}
        style={{ height: '20px' }}
      />

      {/* Actions bar */}
      <div className="flex items-center justify-between mt-auto px-3 pb-3">
        {/* Left: Attach + Edit mode */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*,.txt,.md,.json,.csv,.tsx,.ts,.js,.jsx,.css,.html"
            multiple
            className="hidden"
            id="file-upload"
          />
          <button
            onClick={() => document.getElementById('file-upload')?.click()}
            className={`p-1.5 rounded-full border transition-colors ${styles.button}`}
            title="Attach file"
            type="button"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            className={`p-1.5 rounded-full border transition-all duration-200 ${styles.button}`}
            title="Edit mode"
            type="button"
          >
            <Target className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Model selector + Submit */}
        <div className="flex items-center gap-2">
          {/* Model Selector */}
          {showModelSelector && (
            <div className="relative">
              <button
                onClick={() => setIsModelOpen(!isModelOpen)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-medium transition-colors ${styles.modelButton}`}
                type="button"
              >
                {selectedModel.icon}
                <span>{selectedModel.name}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {isModelOpen && (
                <div className={`absolute bottom-full right-0 mb-2 w-48 rounded-xl z-50 py-1 border ${styles.modelDropdown}`}>
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model)
                        setIsModelOpen(false)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left ${styles.modelItem}`}
                      type="button"
                    >
                      {model.icon}
                      <div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-[10px] text-zinc-500">{model.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={onSubmit}
            disabled={!value.trim() || disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              value.trim() && !disabled ? styles.submitActive : styles.submitDisabled
            }`}
            type="button"
          >
            <span>{submitLabel}</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Click outside to close model selector */}
      {isModelOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsModelOpen(false)}
        />
      )}
    </div>
  )
}

export default AIChatInput
