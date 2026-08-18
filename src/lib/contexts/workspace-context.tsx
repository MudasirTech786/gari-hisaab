"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Workspace } from "@/lib/types";

interface WorkspaceContextType {
  workspace: Workspace | null;
  loading: boolean;
  error: string | null;
  refreshWorkspace: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspace: null,
  loading: true,
  error: null,
  refreshWorkspace: () => {},
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const refreshWorkspace = useCallback(() => {
    const currentFetchId = ++fetchIdRef.current;

    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || currentFetchId !== fetchIdRef.current) return;

        const { data: membership } = await supabase
          .from("workspace_members")
          .select("workspace_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!membership || currentFetchId !== fetchIdRef.current) {
          setWorkspace(null);
          setLoading(false);
          return;
        }

        const { data: ws, error: wsError } = await supabase
          .from("workspaces")
          .select("id, name, slug, owner_id, status, created_at, updated_at")
          .eq("id", membership.workspace_id)
          .single();

        if (currentFetchId !== fetchIdRef.current) return;

        if (wsError) throw wsError;
        setWorkspace(ws);
      } catch (err) {
        if (currentFetchId === fetchIdRef.current) {
          setError(err instanceof Error ? err.message : "Failed to load workspace");
        }
      } finally {
        if (currentFetchId === fetchIdRef.current) setLoading(false);
      }
    }

    load();
  }, []);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  return (
    <WorkspaceContext.Provider value={{ workspace, loading, error, refreshWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
