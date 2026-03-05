'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type ComingSoonTier = 'pro' | 'ai';

interface ComingSoonTierModalProps {
  open: boolean;
  tier: ComingSoonTier;
  onClose: () => void;
  /** Called when user clicks "Continue with Free Account". Pass notifyOnLaunch from checkbox (signup flow). For pricing, parent can ignore param and just scroll. */
  onContinueWithFree: (notifyOnLaunch: boolean) => void;
}

const TIER_LABELS: Record<ComingSoonTier, string> = { pro: 'Pro', ai: 'AI' };
const DISCOUNT_PRICE: Record<ComingSoonTier, string> = { pro: '$9.50/mo', ai: '$24.50/mo' };
const REGULAR_PRICE: Record<ComingSoonTier, string> = { pro: '$19', ai: '$49' };

export default function ComingSoonTierModal({
  open,
  tier,
  onClose,
  onContinueWithFree,
}: ComingSoonTierModalProps) {
  const [notifyOnLaunch, setNotifyOnLaunch] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleContinue = useCallback(() => {
    onContinueWithFree(notifyOnLaunch);
    onClose();
  }, [notifyOnLaunch, onContinueWithFree, onClose]);

  useEffect(() => {
    if (!open) return;
    setNotifyOnLaunch(true);
  }, [open, tier]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const label = TIER_LABELS[tier];
  const discountPrice = DISCOUNT_PRICE[tier];
  const regularPrice = REGULAR_PRICE[tier];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="coming-soon-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-xl max-w-[500px] w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8">
          <div className="flex justify-end mb-1">
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <h2 id="coming-soon-modal-title" className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {label} Tier Coming May 2026
          </h2>
          <p className="text-gray-600 text-sm sm:text-base mb-6">
            The {label} tier isn&apos;t available yet, but you can start with our Free tier today.
          </p>

          <p className="font-semibold text-gray-900 text-sm mb-2">What happens next:</p>
          <ol className="list-decimal list-inside text-gray-600 text-sm space-y-2 mb-6">
            <li>We&apos;ll create your free account now</li>
            <li>You start using ReviewFlo immediately</li>
            <li>We&apos;ll email you when {label} launches</li>
            <li>You get 50% off for the first 3 months</li>
          </ol>

          <p className="font-semibold text-gray-900 text-sm mb-2">Lock in your launch discount:</p>
          <p className="text-gray-600 text-sm mb-1">
            {label}: {discountPrice} for first 3 months
          </p>
          <p className="text-gray-500 text-xs mb-4">(Regular price: {regularPrice}/mo after discount)</p>

          <label className="flex items-start gap-3 cursor-pointer mb-6">
            <input
              type="checkbox"
              checked={notifyOnLaunch}
              onChange={(e) => setNotifyOnLaunch(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-[#4A3428] focus:ring-[#C9A961]"
            />
            <span className="text-sm text-gray-700">
              Yes, notify me when {label} launches
            </span>
          </label>

          <button
            type="button"
            onClick={handleContinue}
            className="w-full px-6 py-3.5 bg-[#4A3428] text-white rounded-lg font-semibold hover:bg-[#4A3428]/90 transition-all"
          >
            Continue with Free Account
          </button>
        </div>
      </div>
    </div>
  );
}
