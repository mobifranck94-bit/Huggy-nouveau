/**
 * BuildFeedback - inline 👍 / 👎 on every generated build message.
 * Persists to Supabase via /api/build-feedback so we can improve prompts over time.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';

interface BuildFeedbackProps {
  userId?: string;
  buildId: string;
  projectId?: string;
  prompt?: string;
}

export function BuildFeedback({ userId, buildId, projectId, prompt }: BuildFeedbackProps) {
  const [sentiment, setSentiment] = useState<'up' | 'down' | null>(null);
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const send = async (payload: { sentiment: 'up' | 'down'; comment?: string }) => {
    if (!userId) return;
    setSubmitting(true);
    try {
      await fetch('/api/build-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, buildId, projectId, prompt, ...payload }),
      });
      setSubmitted(true);
    } catch (err) {
      console.warn('[BuildFeedback] Failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleThumbUp = () => {
    setSentiment('up');
    send({ sentiment: 'up' });
  };

  const handleThumbDown = () => {
    setSentiment('down');
    setShowCommentBox(true);
  };

  const handleCommentSubmit = () => {
    send({ sentiment: 'down', comment: comment.trim() || undefined });
    setShowCommentBox(false);
  };

  if (submitted && !showCommentBox) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-1.5 text-[10px] text-zinc-500"
      >
        <Check className="w-3 h-3 text-green-400" />
        <span>Merci pour ton retour 💙</span>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-2 ml-10 mt-1">
      {!submitted && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Ce résultat t'aide ?</span>
          <button
            onClick={handleThumbUp}
            disabled={submitting}
            aria-label="Retour positif"
            className={`p-1.5 rounded-lg transition-all border ${
              sentiment === 'up'
                ? 'border-green-500/40 bg-green-500/10 text-green-400'
                : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-green-400 hover:border-green-500/30'
            }`}
          >
            <ThumbsUp className="w-3 h-3" />
          </button>
          <button
            onClick={handleThumbDown}
            disabled={submitting}
            aria-label="Retour négatif"
            className={`p-1.5 rounded-lg transition-all border ${
              sentiment === 'down'
                ? 'border-red-500/40 bg-red-500/10 text-red-400'
                : 'border-zinc-800 bg-zinc-900/40 text-zinc-500 hover:text-red-400 hover:border-red-500/30'
            }`}
          >
            <ThumbsDown className="w-3 h-3" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {showCommentBox && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Qu'est-ce qui n'a pas fonctionné ? (optionnel)"
              rows={2}
              aria-label="Commentaire de feedback"
              className="w-full max-w-sm rounded-lg bg-zinc-900 border border-zinc-800 p-2 text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-red-500/40 resize-none"
            />
            <div className="flex gap-2 mt-1.5">
              <button
                onClick={handleCommentSubmit}
                disabled={submitting}
                className="text-[10px] px-3 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-colors"
              >
                Envoyer
              </button>
              <button
                onClick={() => { setShowCommentBox(false); send({ sentiment: 'down' }); }}
                className="text-[10px] px-3 py-1 rounded-md text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Passer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BuildFeedback;
