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
      user: "from-primary/50 to-accent/50",
      userText: "bg-primary/30"
    },
    green: {
      user: "from-success/50 to-accent/50", 
      userText: "bg-success/30"
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
            <div className="h-10 w-10 shrink-0 rounded-full bg-muted"></div>
          )}
          <div
            className={`w-3/5 rounded-2xl p-4 ${
              i % 2 === 0 
                ? `rounded-br-none bg-gradient-to-br ${colors[colorScheme].user}` 
                : "rounded-bl-none bg-muted"
            }`}
          >
            <div
              className={`mb-2 h-4 rounded ${
                i % 2 === 0 
                  ? colors[colorScheme].userText
                  : "bg-muted/70"
              } w-3/4`}
            ></div>
            <div
              className={`h-4 rounded ${
                i % 2 === 0 
                  ? colors[colorScheme].userText
                  : "bg-muted/70"
              } w-full`}
            ></div>
          </div>
          {i % 2 === 0 && (
            <div className="h-10 w-10 shrink-0 rounded-full bg-muted"></div>
          )}
        </div>
      ))}
    </div>
  );
};