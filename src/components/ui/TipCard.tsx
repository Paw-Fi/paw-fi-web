import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Tip Card Component using shadcn Card
export function TipCard({ emoji, title, content }: { emoji: string; title: string; content: string }) {
  return (
    <Card className="bg-muted/50 border-none shadow-sm">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="flex items-center gap-2 text-xs font-medium text-foreground">
          <span className="text-sm">{emoji}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {content}
        </p>
      </CardContent>
    </Card>
  );
}
