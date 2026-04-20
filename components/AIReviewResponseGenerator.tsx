import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { trackEvent } from '../lib/posthog-provider';

interface AIReviewResponseGeneratorProps {
  open: boolean;
  onClose: () => void;
  onUseResponse: (response: string) => void;
}

export default function AIReviewResponseGenerator({
  open,
  onClose,
  onUseResponse,
}: AIReviewResponseGeneratorProps) {
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [tone, setTone] = useState<'friendly' | 'professional' | 'casual'>(
    'friendly'
  );
  const [specificIssues, setSpecificIssues] = useState('');
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!reviewText.trim()) {
      setError('Please enter the review text');
      return;
    }

    setError('');
    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        setIsGenerating(false);
        return;
      }

      const res = await fetch('/api/ai/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reviewText: reviewText.trim(),
          reviewRating,
          tone,
          specificIssues: specificIssues.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.upgrade) {
          setError('AI tier required. Upgrade to use AI review responses.');
        } else {
          setError(data.error || 'Failed to generate response');
        }
        setIsGenerating(false);
        return;
      }

      setGeneratedResponse(data.response);

      try {
        trackEvent('ai_review_response_generated', { rating: reviewRating, tone });
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error('AI review response generation error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUse = () => {
    if (generatedResponse) {
      onUseResponse(generatedResponse);
      onClose();
      // Reset for next time
      setGeneratedResponse('');
      setReviewText('');
      setSpecificIssues('');
    }
  };

  const handleClose = () => {
    onClose();
    setError('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-slate-800 mb-1">
          AI Review Response Generator
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          Generate professional responses to Google reviews using AI
        </p>

        <div className="space-y-4">
          {/* Review Text */}
          <div>
            <label
              htmlFor="reviewText"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Review Text *
            </label>
            <textarea
              id="reviewText"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800"
              placeholder="Paste the customer's review here..."
              required
            />
          </div>

          {/* Rating Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Review Rating *
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setReviewRating(rating)}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors border ${
                    reviewRating === rating
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {rating}⭐
                </button>
              ))}
            </div>
          </div>

          {/* Tone Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Response Tone *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['friendly', 'professional', 'casual'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`px-4 py-2.5 rounded-lg font-medium transition-colors border capitalize ${
                    tone === t
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Specific Issues (for negative reviews) */}
          {reviewRating <= 3 && (
            <div>
              <label
                htmlFor="specificIssues"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Specific Issues to Address (optional)
              </label>
              <textarea
                id="specificIssues"
                value={specificIssues}
                onChange={(e) => setSpecificIssues(e.target.value.slice(0, 200))}
                rows={2}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800"
                placeholder="e.g., Billing error has been corrected..."
                maxLength={200}
              />
              <p className="text-xs text-slate-500 mt-1">
                {specificIssues.length}/200
              </p>
            </div>
          )}

          {/* Generate Button */}
          {!generatedResponse && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !reviewText.trim()}
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Generate Response'}
            </button>
          )}

          {/* Generated Response */}
          {generatedResponse && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Generated Response
              </label>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-slate-800 whitespace-pre-wrap">
                  {generatedResponse}
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Regenerate
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            {generatedResponse && (
              <button
                type="button"
                onClick={handleUse}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                Copy to Clipboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
