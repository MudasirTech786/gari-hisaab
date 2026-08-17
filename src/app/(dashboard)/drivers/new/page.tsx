"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createDriver } from "@/app/actions/drivers";
import { driverSchema, type DriverInput } from "@/lib/validations";

export default function NewDriverPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DriverInput>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      name: "",
      phone: "",
      status: "active",
    },
  });

  const statusValue = watch("status");

  async function onSubmit(data: DriverInput) {
    setIsSubmitting(true);
    const result = await createDriver(data);
    setIsSubmitting(false);

    if (result.success) {
      toast.success("Driver added successfully");
      router.push("/drivers");
    } else {
      toast.error(result.error ?? "Failed to add driver");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Add Driver">
        <Link href="/drivers">
          <Button variant="outline">
            <ArrowLeft className="size-4" />
            Back
          </Button>
        </Link>
      </PageHeader>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Driver Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Enter driver name"
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="Enter phone number (optional)"
                {...register("phone")}
              />
            </div>

            <div className="space-y-2">
              <Label>Status *</Label>
              <Select
                value={statusValue}
                onValueChange={(val) =>
                  setValue("status", val as "active" | "inactive")
                }
              >
                <SelectTrigger className="w-full" aria-invalid={!!errors.status}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-xs text-destructive">
                  {errors.status.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link href="/drivers">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Add Driver"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
