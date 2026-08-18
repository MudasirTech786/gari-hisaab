"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Wrench } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Maintenance"
        description="Track vehicle maintenance and service history"
      />
      <Card>
        <CardContent className="flex h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-lime-300/10">
              <Wrench className="size-8 text-lime-300" />
            </div>
            <h3 className="text-lg font-semibold text-white">Coming Soon</h3>
            <p className="mt-2 text-sm text-zinc-400 max-w-md">
              Vehicle maintenance tracking will be available soon. Track oil changes, brake service, tyre replacements, and more.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
