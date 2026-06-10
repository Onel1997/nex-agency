import { formatDate } from "@/lib/dashboard/format";
import type { ActivityLog } from "@/lib/dashboard/activity-types";

interface ActivityFeedProps {
  activities: ActivityLog[];
  compact?: boolean;
}

export function ActivityFeed({ activities, compact = false }: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted">
        Noch keine Aktivitäten vorhanden.
      </p>
    );
  }

  return (
    <ul className={compact ? "space-y-3" : "space-y-4"}>
      {activities.map((activity) => (
        <li
          key={activity.id}
          className="flex items-start gap-3 rounded-xl border border-border/60 bg-white/[0.02] px-4 py-3"
        >
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-400/80" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-foreground">{activity.message}</p>
            <p className="mt-1 text-xs text-muted-soft">
              {formatDate(activity.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
