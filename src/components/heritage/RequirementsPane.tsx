"use client";

import { useState } from "react";
import { Circle, CircleCheck, Plus } from "lucide-react";

import { type Requirement, type Section } from "@/lib/schema";
import { PANE_HEADERS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddItemDialog } from "@/components/heritage/AddItemDialog";

type RequirementsPaneProps = {
  section: Section | null;
  requirements: Requirement[];
  onToggleSatisfied: (requirementId: string, satisfied: boolean) => void;
  onAddRequirement: (title: string) => void;
};

export function RequirementsPane({
  section,
  requirements,
  onToggleSatisfied,
  onAddRequirement,
}: RequirementsPaneProps) {
  const [adding, setAdding] = useState(false);

  const list = section
    ? requirements.filter((r) => r.sectionId === section.id)
    : [];

  return (
    <section className="flex min-h-0 flex-1 flex-col border-b border-border bg-background">
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/40 px-3">
        <h2 className="truncate text-xs font-semibold text-foreground">
          {PANE_HEADERS.requirements}
        </h2>
        {section && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setAdding(true)}
            aria-label="要件カードを追加"
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus />
          </Button>
        )}
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-2 p-3">
          {!section && (
            <p className="px-1 py-4 text-center text-xs text-muted-foreground">
              節を選択してください。
            </p>
          )}
          {section && list.length === 0 && (
            <p className="px-1 py-4 text-center text-xs text-muted-foreground">
              この節の要件カードはありません。
            </p>
          )}
          {list.map((r) => (
            <Card key={r.id} size="sm">
              <CardContent className="flex flex-col gap-1.5">
                <div className="flex items-start gap-2">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onToggleSatisfied(r.id, !r.satisfied)}
                    aria-pressed={r.satisfied}
                    aria-label={
                      r.satisfied ? "充足を取り消す" : "充足にする"
                    }
                    className={cn(
                      "mt-0.5 shrink-0",
                      r.satisfied
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {r.satisfied ? <CircleCheck /> : <Circle />}
                  </Button>
                  <span className="flex-1 text-sm font-medium leading-snug">
                    {r.title}
                  </span>
                </div>
                {r.condition && (
                  <p className="pl-8 text-xs text-muted-foreground">
                    条件: {r.condition}
                  </p>
                )}
                {r.sourceDoc && (
                  <div className="pl-8">
                    <Badge variant="outline">
                      出典: {r.sourceDoc} {r.sourceLocation}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <AddItemDialog
        open={adding}
        onOpenChange={setAdding}
        title="要件カードを追加"
        description="この節に記載要件カードを追加します"
        fieldLabel="要件名"
        fieldId="requirement-title"
        placeholder="例: 計画期間を設定"
        onAdd={onAddRequirement}
      />
    </section>
  );
}
