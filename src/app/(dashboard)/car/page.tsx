"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Car,
  Loader2,
  Pencil,
  Save,
  Hash,
  Calendar,
  Gauge,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { getCars, createCar, updateCar } from "@/app/actions/cars";
import { carSchema, type CarInput } from "@/lib/validations";
import type { Car as CarType } from "@/lib/types";

export default function CarPage() {
  const [cars, setCars] = useState<CarType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCarId, setEditingCarId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CarInput>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      name: "",
      registration_number: "",
      make: "",
      model: "",
      year: undefined,
      current_km: 0,
      is_active: true,
    },
  });

  const isActive = watch("is_active");

  useEffect(() => {
    async function fetchCars() {
      setLoading(true);
      const result = await getCars();
      if (result.success) {
        setCars(result.data ?? []);
      } else {
        toast.error(result.error ?? "Failed to load cars");
      }
      setLoading(false);
    }
    fetchCars();
  }, []);

  const car = cars[0] ?? null;

  function handleEdit(carData: CarType) {
    setEditingCarId(carData.id);
    reset({
      name: carData.name,
      registration_number: carData.registration_number,
      make: carData.make || "",
      model: carData.model || "",
      year: carData.year || undefined,
      current_km: carData.current_km,
      is_active: carData.is_active,
    });
    setIsEditing(true);
  }

  function handleAddNew() {
    setEditingCarId(null);
    reset({
      name: "",
      registration_number: "",
      make: "",
      model: "",
      year: undefined,
      current_km: 0,
      is_active: true,
    });
    setIsEditing(true);
  }

  async function onSubmit(data: CarInput) {
    setIsSubmitting(true);

    let result;
    if (editingCarId) {
      result = await updateCar(editingCarId, data);
    } else {
      result = await createCar(data);
    }

    setIsSubmitting(false);

    if (result.success) {
      toast.success(
        editingCarId ? "Car updated successfully" : "Car added successfully"
      );
      setIsEditing(false);
      setEditingCarId(null);

      const carsResult = await getCars();
      if (carsResult.success) {
        setCars(carsResult.data ?? []);
      }
    } else {
      toast.error(result.error ?? "Failed to save car");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Car Management" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Car Management" />

      {isEditing ? (
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>
              {editingCarId ? "Edit Car" : "Add Car"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="car-name">Name *</Label>
                <Input
                  id="car-name"
                  placeholder="e.g., Corolla White"
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
                <Label htmlFor="car-reg">Registration Number *</Label>
                <Input
                  id="car-reg"
                  placeholder="e.g., ABC-1234"
                  {...register("registration_number")}
                  aria-invalid={!!errors.registration_number}
                />
                {errors.registration_number && (
                  <p className="text-xs text-destructive">
                    {errors.registration_number.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="car-make">Make</Label>
                  <Input
                    id="car-make"
                    placeholder="e.g., Toyota"
                    {...register("make")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="car-model">Model</Label>
                  <Input
                    id="car-model"
                    placeholder="e.g., Corolla"
                    {...register("model")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="car-year">Year</Label>
                  <Input
                    id="car-year"
                    type="number"
                    placeholder="e.g., 2023"
                    {...register("year")}
                    aria-invalid={!!errors.year}
                  />
                  {errors.year && (
                    <p className="text-xs text-destructive">
                      {errors.year.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="car-km">Current KM *</Label>
                  <Input
                    id="car-km"
                    type="number"
                    placeholder="0"
                    {...register("current_km")}
                    aria-invalid={!!errors.current_km}
                  />
                  {errors.current_km && (
                    <p className="text-xs text-destructive">
                      {errors.current_km.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="car-active">Active</Label>
                <button
                  type="button"
                  id="car-active"
                  role="switch"
                  aria-checked={isActive}
                  onClick={() => setValue("is_active", !isActive)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                    isActive ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${
                      isActive ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditingCarId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="size-4" />
                      {editingCarId ? "Save Changes" : "Add Car"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : car ? (
        <Card className="max-w-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{car.name}</CardTitle>
              <Badge
                variant={car.is_active ? "default" : "secondary"}
                className={
                  car.is_active
                    ? "border-lime-300/15 bg-lime-300/10 text-lime-200"
                    : "border-white/8 bg-white/[.05] text-zinc-400"
                }
              >
                {car.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Hash className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Reg #:</span>
                <span className="font-medium">{car.registration_number}</span>
              </div>
              {car.make && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Make:</span>
                  <span className="font-medium">{car.make}</span>
                </div>
              )}
              {car.model && (
                <div className="flex items-center gap-3 text-sm">
                  <Car className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Model:</span>
                  <span className="font-medium">{car.model}</span>
                </div>
              )}
              {car.year && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Year:</span>
                  <span className="font-medium">{car.year}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Gauge className="size-4 text-muted-foreground" />
                <span className="text-muted-foreground">Current KM:</span>
                <span className="font-medium">
                  {car.current_km.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mt-4 border-t pt-4">
              <Button variant="outline" onClick={() => handleEdit(car)}>
                <Pencil className="size-4" />
                Edit Car
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="max-w-lg">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Car className="mb-3 size-10 text-muted-foreground/50" />
            <p className="mb-4 text-sm text-muted-foreground">
              No car added yet. Add your first car to get started.
            </p>
            <Button onClick={handleAddNew}>
              <Car className="size-4" />
              Add Car
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
