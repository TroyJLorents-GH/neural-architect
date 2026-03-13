"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface DashboardSectionProps {
  id: string;
  title: string;
  count?: number;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  draggable?: boolean;
}

export function DashboardSection({
  id,
  title,
  count,
  badge,
  children,
  defaultCollapsed = false,
  draggable = true,
}: DashboardSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-transparent transition-all",
        isDragging && "opacity-50 border-primary/30 bg-accent/30 shadow-lg z-50"
      )}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        {draggable && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing rounded p-1 text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <h2 className="text-xl font-semibold">{title}</h2>
        {count !== undefined && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {count}
          </span>
        )}
        {badge}
        <div className="ml-auto">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            {collapsed ? (
              <>
                Expand <ChevronDown className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                Collapse <ChevronUp className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Section content */}
      {!collapsed && children}

      {collapsed && (
        <div className="rounded-lg border border-dashed border-border py-3 text-center">
          <p className="text-xs text-muted-foreground">
            {title} section collapsed
          </p>
        </div>
      )}
    </div>
  );
}
