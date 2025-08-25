import { OptimizedImage } from "@/components/seo/optimized-image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CardProps {
  title: string;
  description: string;
  icon: string;
  lessonCount: number;
  className?: string;
  onClick?: () => void;
  isEmbedded?: boolean;
}

export function CourseCard({ title, description, icon, lessonCount, className, onClick, isEmbedded = false }: CardProps) {
  return (
    <Card
      className={cn(
        "transition-all duration-300 hover:shadow-lg",
        isEmbedded 
          ? "border-border/50 bg-muted/50 hover:bg-muted/70" 
          : "shadow-md hover:shadow-lg",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className={isEmbedded ? "p-4" : "p-6"}>
        <div className="flex items-start gap-4">
         
          <div className="flex-grow min-w-0">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className={cn(
                "font-semibold",
                isEmbedded ? "text-base" : "text-lg"
              )}>
               {icon} {title}
              </CardTitle>
              {!isEmbedded && (
                <Badge variant="secondary" className="bg-primary/10 text-primary shrink-0">
                  {lessonCount} {lessonCount === 1 ? 'Lesson' : 'Lessons'}
                </Badge>
              )}
            </div>
            <CardDescription className="text-sm line-clamp-2 mt-1">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {!isEmbedded && (
        <CardFooter className="p-6 pt-0">
          <div className="ml-auto text-sm font-semibold text-primary hover:underline">
            Start Learning →
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
