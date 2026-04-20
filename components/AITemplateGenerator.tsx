import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { trackEvent } from '../lib/posthog-provider';

interface AITemplateGeneratorProps {
  open: boolean;
  onClose: () => void;
  onUseTemplate: (template: string) => void;
}

export default function AITemplateGenerator({
  open,
  onClose,
  onUseTemplate,
}: AITemplateGeneratorProps) {
  const [tone, setTone] = useState<'friendly' | 'professional' | 'casual'>(
    'friendly'
  );
  const [channel, setChannel] = useState<'sms' | 'email'>('email');
  const [customContext, setCustomContext] = useState('');
  const [generatedTemplate, setGeneratedTemplate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setError('');
    setIsGenerating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expired. Please log in again.');
        setIsGenerating(false);
        return;
      }

      const res = await fetch('/api/ai/generate-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tone,
          channel,
          customContext: customContext.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.upgrade) {
          setError('AI tier required. Upgrade to use AI template generation.');
        } else {
          setError(data.error || 'Failed to generate template');
        }
        setIsGenerating(false);
        return;
      }

      setGeneratedTemplate(data.template);

      try {
        trackEvent('ai_template_generated', { tone, channel });
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error('AI template generation error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUse = () => {
    if (generatedTemplate) {
      onUseTemplate(generatedTemplate);
      onClose();
      // Reset for next time
      setGeneratedTemplate('');
      setCustomContext('');
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
          AI Template Generator
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          Generate personalized review request templates using AI
        </p>

        <div className="space-y-4">
          {/* Channel Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Channel *
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors border ${
                  channel === 'email'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setChannel('sms')}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors border ${
                  channel === 'sms'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                SMS
              </button>
            </div>
          </div>

          {/* Tone Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tone *
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

          {/* Custom Context */}
          <div>
            <label
              htmlFor="customContext"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Additional Context (optional)
            </label>
            <textarea
              id="customContext"
              value={customContext}
              onChange={(e) => setCustomContext(e.target.value.slice(0, 300))}
              rows={2}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800"
              placeholder="e.g., We focus on luxury spa treatments..."
              maxLength={300}
            />
            <p className="text-xs text-slate-500 mt-1">
              {customContext.length}/300
            </p>
          </div>

          {/* Generate Button */}
          {!generatedTemplate && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Generate Template'}
            </button>
          )}

          {/* Generated Template */}
          {generatedTemplate && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Generated Template
              </label>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-slate-800 whitespace-pre-wrap">
                  {generatedTemplate}
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
            {generatedTemplate && (
              <button
                type="button"
                onClick={handleUse}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              >
                Use This Template
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
