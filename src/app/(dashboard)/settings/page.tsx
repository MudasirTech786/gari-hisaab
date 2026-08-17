"use client";

import { useState, useEffect } from "react";
import {
  User,
  Info,
  Database,
  Mail,
  Shield,
  HardDrive,
  Upload,
  Download,
  Loader2,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email || "");
          setUserName(
            (user.user_metadata?.full_name as string) ||
              user.email?.split("@")[0] ||
              ""
          );
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and application preferences"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="size-5 text-muted-foreground" />
              <CardTitle>Profile Info</CardTitle>
            </div>
            <CardDescription>
              Your account information (read only)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="size-3.5" />
                    Name
                  </div>
                  <p className="text-sm font-medium">
                    {userName || "Not set"}
                  </p>
                </div>
                <Separator />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="size-3.5" />
                    Email
                  </div>
                  <p className="text-sm font-medium">
                    {userEmail || "Not set"}
                  </p>
                </div>
                <Separator />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="size-3.5" />
                    Role
                  </div>
                  <p className="text-sm font-medium capitalize">Owner</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="size-5 text-muted-foreground" />
              <CardTitle>App Info</CardTitle>
            </div>
            <CardDescription>
              Information about Gari Hisaab
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Application</div>
              <p className="text-sm font-medium">Gari Hisaab</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Version</div>
              <p className="text-sm font-medium">0.1.0</p>
            </div>
            <Separator />
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Description</div>
              <p className="text-sm font-medium">
                Car earnings and management system for tracking InDrive and
                other ride earnings, expenses, and generating detailed reports.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="size-5 text-muted-foreground" />
              <CardTitle>Data Management</CardTitle>
            </div>
            <CardDescription>
              Export or import your data (coming soon)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <HardDrive className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Export Data</p>
                    <p className="text-xs text-muted-foreground">
                      Download all your data as CSV
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  <Download className="size-3" />
                  Export
                </Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <HardDrive className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Import Data</p>
                    <p className="text-xs text-muted-foreground">
                      Import data from a CSV file
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  <Upload className="size-3" />
                  Import
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
