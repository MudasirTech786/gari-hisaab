"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Car, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { createNewWorkspace, createInitialCar, createInitialDriver } from "@/app/actions/workspace";
import { useWorkspace } from "@/lib/contexts/workspace-context";

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshWorkspace } = useWorkspace();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workspaceName, setWorkspaceName] = useState("");
  const [carName, setCarName] = useState("");
  const [carReg, setCarReg] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");

  async function handleCreateWorkspace() {
    if (!workspaceName.trim()) {
      setError("Please enter your fleet name");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await createNewWorkspace(workspaceName);
      if (!result.success) {
        setError(result.error ?? "An error occurred");
        return;
      }
      await refreshWorkspace();
      setStep(2);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCar() {
    if (!carName.trim() || !carReg.trim()) {
      setError("Please enter car name and registration number");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await createInitialCar({
        name: carName,
        registration_number: carReg,
      });
      if (!result.success) {
        setError(result.error ?? "An error occurred");
        return;
      }
      setStep(3);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddDriver() {
    setLoading(true);
    setError(null);
    try {
      if (driverName.trim()) {
        const result = await createInitialDriver({
          name: driverName,
          phone: driverPhone,
        });
        if (!result.success) {
          setError(result.error ?? "An error occurred");
          return;
        }
      }
      router.push("/dashboard");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-lime-300/20 bg-lime-300/10">
              <Car className="size-7 text-lime-300" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to Gari Hisaab</h1>
          <p className="text-zinc-400 text-sm">Set up your fleet management workspace</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s <= step ? "w-8 bg-lime-300" : "w-8 bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {step === 1 && (
          <Card className="border-border bg-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-lime-300/10 text-lime-300 text-sm font-bold">1</span>
                <h2 className="text-lg font-semibold text-white">Create Your Fleet</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Fleet / Business Name</label>
                <Input
                  placeholder="e.g. Ahmed Transport"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="bg-white/[.04] border-white/[.08] text-white placeholder:text-zinc-500"
                />
              </div>
              <Button
                onClick={handleCreateWorkspace}
                disabled={loading}
                className="w-full bg-lime-300 text-[#080b0a] hover:bg-lime-200 font-semibold"
              >
                {loading ? "Creating..." : "Continue"}
                {!loading && <ArrowRight className="ml-2 size-4" />}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card className="border-border bg-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-lime-300/10 text-lime-300 text-sm font-bold">2</span>
                <h2 className="text-lg font-semibold text-white">Add Your First Vehicle</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Vehicle Name</label>
                <Input
                  placeholder="e.g. Corolla, Alto"
                  value={carName}
                  onChange={(e) => setCarName(e.target.value)}
                  className="bg-white/[.04] border-white/[.08] text-white placeholder:text-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Registration Number</label>
                <Input
                  placeholder="e.g. ABC-1234"
                  value={carReg}
                  onChange={(e) => setCarReg(e.target.value)}
                  className="bg-white/[.04] border-white/[.08] text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => setStep(3)}
                  className="flex-1 text-zinc-400 hover:text-white"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={handleAddCar}
                  disabled={loading}
                  className="flex-1 bg-lime-300 text-[#080b0a] hover:bg-lime-200 font-semibold"
                >
                  {loading ? "Adding..." : "Add Vehicle"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card className="border-border bg-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-lime-300/10 text-lime-300 text-sm font-bold">3</span>
                <h2 className="text-lg font-semibold text-white">Add Your First Driver</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Driver Name</label>
                <Input
                  placeholder="e.g. Ali"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="bg-white/[.04] border-white/[.08] text-white placeholder:text-zinc-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Phone Number (optional)</label>
                <Input
                  placeholder="e.g. 0300-1234567"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="bg-white/[.04] border-white/[.08] text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={() => router.push("/dashboard")}
                  className="flex-1 text-zinc-400 hover:text-white"
                >
                  Skip for now
                </Button>
                <Button
                  onClick={handleAddDriver}
                  disabled={loading}
                  className="flex-1 bg-lime-300 text-[#080b0a] hover:bg-lime-200 font-semibold"
                >
                  {loading ? "Adding..." : "Complete Setup"}
                  {!loading && <Check className="ml-2 size-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
