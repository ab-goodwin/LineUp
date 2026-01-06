import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number; // 0-5
  maxRating?: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  className?: string;
}

export function RatingStars({ 
  rating, 
  maxRating = 5, 
  onRate, 
  readonly = false,
  className 
}: RatingStarsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: maxRating }).map((_, i) => {
        const starValue = i + 1;
        const isFilled = starValue <= rating;
        
        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => onRate?.(starValue)}
            className={cn(
              "transition-all duration-200 focus:outline-none",
              readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
            )}
          >
            <Star
              className={cn(
                "w-5 h-5",
                isFilled 
                  ? "fill-accent text-accent" 
                  : "fill-transparent text-muted-foreground"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
