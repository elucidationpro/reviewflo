import Image from 'next/image';

export default function ReviewFloFooter() {
  return (
    <a
      href="https://usereviewflo.com"
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-8 pt-6 border-t border-gray-200 transition-opacity hover:opacity-70"
    >
      <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
        <span>Powered by</span>
        <div className="relative w-24 h-6">
          <Image
            src="/images/reviewflo-logo.svg"
            alt="ReviewFlo"
            fill
            className="object-contain"
          />
        </div>
      </div>
    </a>
  );
}
