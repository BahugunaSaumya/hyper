"use client";

type Props = {
  message: string;
  onClose?: () => void;
};

export default function SuccessMessage({ message, onClose }: Props) {
  if (!message) return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-slideIn">
      <div className="bg-green-50 border border-green-300 text-green-700 px-5 py-3 rounded-lg shadow-lg flex items-center gap-4 min-w-[280px] max-w-md">
        
        <div className="flex-1 text-md font-semibold text-center">
          {message}
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-green-500 hover:text-green-700 text-lg font-bold leading-none"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
