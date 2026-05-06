import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ElementType;
  className?: string;
  delay?: number;
}

export function StatCard({ label, value, description, icon: Icon, className, delay = 0 }: StatCardProps) {
  return (
    <div
      className={cn(
        "p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full group",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm font-medium uppercase tracking-wider text-[#5c473a]">{label}</span>
        {Icon && <Icon className="w-5 h-5 text-primary/50 group-hover:text-primary transition-colors" />}
      </div>
      <div>
        <div className="text-2xl md:text-3xl font-display font-bold text-foreground">
          {value}
        </div>
        {description && (
          <div className="text-xs text-muted-foreground mt-1 font-medium">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
