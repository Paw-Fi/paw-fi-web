interface ChatSkeletonProps {
  className?: string;
  messageCount?: number;
  colorScheme?: 'purple' | 'green';
}

export const ChatSkeleton: React.FC<ChatSkeletonProps> = ({
  className = "",
  messageCount = 5,
  colorScheme = 'purple'
}) => {
  const colors = {
    purple: {
      user: "from-purple-400/50 to-indigo-500/50",
      userText: "bg-purple-300/50 dark:bg-purple-600/50"
    },
    green: {
      user: "from-green-400/50 to-emerald-500/50", 
      userText: "bg-green-300/50 dark:bg-green-600/50"
    }
  };

  return (
    <div className={`space-y-6 p-4 sm:p-6 ${className}`}>
      {Array.from({ length: messageCount }, (_, i) => i + 1).map((i) => (
        <div
          key={i}
          className={`flex animate-pulse items-end gap-3 ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
        >
          {i % 2 !== 0 && (
            <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200/80 dark:bg-slate-700/80"></div>
          )}
          <div
            className={`w-3/5 rounded-2xl p-4 ${
              i % 2 === 0 
                ? `rounded-br-none bg-gradient-to-br ${colors[colorScheme].user}` 
                : "rounded-bl-none bg-slate-200/80 dark:bg-slate-700/80"
            }`}
          >
            <div
              className={`mb-2 h-4 rounded ${
                i % 2 === 0 
                  ? colors[colorScheme].userText
                  : "bg-slate-300/50 dark:bg-slate-600/50"
              } w-3/4`}
            ></div>
            <div
              className={`h-4 rounded ${
                i % 2 === 0 
                  ? colors[colorScheme].userText
                  : "bg-slate-300/50 dark:bg-slate-600/50"
              } w-full`}
            ></div>
          </div>
          {i % 2 === 0 && (
            <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200/80 dark:bg-slate-700/80"></div>
          )}
        </div>
      ))}
    </div>
  );
};