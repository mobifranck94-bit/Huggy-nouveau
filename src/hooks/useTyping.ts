import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTypingOptions {
  text: string;
  enabled: boolean;
  onComplete?: () => void;
  baseDelay?: number;
}

interface UseTypingReturn {
  visibleText: string;
  isComplete: boolean;
  isTyping: boolean;
}

/**
 * Hook for word-by-word typing animation (Windsurf style)
 * Speed varies based on word length and punctuation
 */
export function useTyping({
  text,
  enabled,
  onComplete,
  baseDelay = 30,
}: UseTypingOptions): UseTypingReturn {
  const [visibleText, setVisibleText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wordsRef = useRef<string[]>([]);
  const currentIndexRef = useRef(0);

  const getDelayForWord = useCallback((word: string, nextChar: string): number => {
    // Short words (< 4 chars): faster
    if (word.length < 4) return baseDelay * 0.7;
    // Long words (> 8 chars): slightly slower
    if (word.length > 8) return baseDelay * 1.3;
    // Default
    return baseDelay;
  }, [baseDelay]);

  const getDelayForChar = useCallback((char: string): number => {
    // Punctuation pauses
    if (char === '.' || char === '!' || char === '?') return baseDelay * 4; // Long pause for sentences
    if (char === ',' || char === ';') return baseDelay * 2; // Medium pause
    if (char === '\n') return baseDelay * 5; // Line break
    return baseDelay * 0.5; // Regular chars
  }, [baseDelay]);

  useEffect(() => {
    if (!enabled || !text) {
      setVisibleText('');
      setIsComplete(false);
      setIsTyping(false);
      return;
    }

    // Reset state
    setIsTyping(true);
    setIsComplete(false);
    setVisibleText('');
    currentIndexRef.current = 0;

    // Split text into tokens (words + punctuation)
    const tokens = text.match(/\S+\s*/g) || [];
    wordsRef.current = tokens;

    const typeNext = () => {
      if (currentIndexRef.current >= wordsRef.current.length) {
        setIsComplete(true);
        setIsTyping(false);
        onComplete?.();
        return;
      }

      const token = wordsRef.current[currentIndexRef.current];
      const nextToken = wordsRef.current[currentIndexRef.current + 1];
      const lastChar = token.slice(-1);

      setVisibleText(prev => prev + token);
      currentIndexRef.current++;

      // Calculate delay for this token
      let delay = getDelayForWord(token, nextToken?.[0] || '');
      delay += getDelayForChar(lastChar);

      timeoutRef.current = setTimeout(typeNext, delay);
    };

    // Start typing after a small initial delay
    timeoutRef.current = setTimeout(typeNext, 100);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [text, enabled, onComplete, getDelayForWord, getDelayForChar]);

  return { visibleText, isComplete, isTyping };
}

/**
 * Hook for streaming multiple sections with stagger effect (Windsurf cascade)
 */
interface Section {
  id: string;
  type: 'text' | 'code' | 'list' | 'thinking';
  content: string;
}

interface UseStreamingCascadeOptions {
  sections: Section[];
  enabled: boolean;
  staggerDelay?: number;
}

interface UseStreamingCascadeReturn {
  visibleSections: Section[];
  currentSectionIndex: number;
  isComplete: boolean;
}

export function useStreamingCascade({
  sections,
  enabled,
  staggerDelay = 400,
}: UseStreamingCascadeOptions): UseStreamingCascadeReturn {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!enabled || sections.length === 0) {
      setVisibleCount(0);
      setIsComplete(false);
      return;
    }

    let current = 0;
    const interval = setInterval(() => {
      current++;
      setVisibleCount(current);

      if (current >= sections.length) {
        clearInterval(interval);
        setIsComplete(true);
      }
    }, staggerDelay);

    return () => clearInterval(interval);
  }, [sections, enabled, staggerDelay]);

  return {
    visibleSections: sections.slice(0, visibleCount),
    currentSectionIndex: visibleCount - 1,
    isComplete,
  };
}
