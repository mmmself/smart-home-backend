import React from "react";
import * as Icons from "lucide-react";

interface EmptyStateProps {
  icon: keyof typeof Icons;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const IconComponent = Icons[icon] as React.ComponentType<{ className?: string }>;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-950/30">
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900 text-zinc-400 mb-4">
        {IconComponent && <IconComponent className="w-6 h-6" />}
      </div>
      <h3 className="font-sans font-medium text-base text-zinc-200 mb-1">{title}</h3>
      <p className="font-sans text-xs text-zinc-500 max-w-xs mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition duration-150"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
