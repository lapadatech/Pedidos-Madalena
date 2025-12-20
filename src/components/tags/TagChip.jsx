import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

function TagChip({ nome, cor, onRemove, className }) {
  const textColor = getContrastColor(cor);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium pointer-events-auto select-none",
        className
      )}
      style={{ backgroundColor: cor, color: textColor }}
    >
      {nome}

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // não fecha popover
            onRemove();
          }}
          className="hover:opacity-70 transition-opacity flex items-center justify-center pointer-events-auto"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

// Função auxiliar para determinar cor do texto baseado no fundo
function getContrastColor(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#FFFFFF';
}

export default TagChip;
