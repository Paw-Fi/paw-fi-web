// Tip Card Component
export function TipCard({ emoji, title, content }: { emoji: string; title: string; content: string }) {
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{emoji}</span>
        <h4 className="font-medium text-xs text-gray-900 dark:text-white">
          {title}
        </h4>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        {content}
      </p>
    </div>
  );
}
