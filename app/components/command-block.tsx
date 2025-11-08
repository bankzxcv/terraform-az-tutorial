'use client';

import { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface CommandBlockProps {
  command: string;
  description?: string;
}

export function CommandBlock({ command, description }: CommandBlockProps): React.ReactElement {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(command);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="my-4">
      {description && (
        <p className="text-sm text-gray-600 mb-2">{description}</p>
      )}
      <div className="relative bg-gray-900 rounded-lg p-4 flex items-center gap-3">
        <Terminal className="w-5 h-5 text-green-400 flex-shrink-0" />
        <code className="flex-1 text-gray-100 font-mono text-sm">{command}</code>
        <button
          onClick={handleCopy}
          className="p-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors flex-shrink-0"
          aria-label="Copy command"
        >
          {isCopied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-300" />
          )}
        </button>
      </div>
    </div>
  );
}




