"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { FileText } from "lucide-react";

export default function DocumentsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Documents"
        description="Manage vehicle documents and expiry alerts"
      />
      <Card>
        <CardContent className="flex h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-lime-300/10">
              <FileText className="size-8 text-lime-300" />
            </div>
            <h3 className="text-lg font-semibold text-white">Coming Soon</h3>
            <p className="mt-2 text-sm text-zinc-400 max-w-md">
              Vehicle document management will be available soon. Track registration, insurance, token tax, and fitness certificates with expiry alerts.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
