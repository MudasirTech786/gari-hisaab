"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { provisionCustomer, type ProvisionCustomerInput } from "@/app/actions/admin-customers"
import Link from "next/link"

const schema = z.object({
  full_name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  fleet_name: z.string().min(2, "Fleet name is required"),
  phone: z.string().optional(),
  initial_password: z.string().min(8, "Password must be at least 8 characters"),
})

type FormData = z.infer<typeof schema>

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const result = await provisionCustomer(data as ProvisionCustomerInput)
    setLoading(false)

    if (result.success) {
      setSuccess(true)
      toast.success("Customer provisioned successfully")
    } else {
      toast.error(result.error || "Failed to provision customer")
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-12">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
          <h2 className="mt-4 text-xl font-bold text-gray-900">Customer Created</h2>
          <p className="mt-2 text-sm text-gray-600">
            The customer account has been provisioned. They can now log in with the email and password you provided.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link href="/admin/customers">
              <Button variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50">
                Back to Customers
              </Button>
            </Link>
            <Button
              onClick={() => {
                setSuccess(false)
                router.refresh()
              }}
              className="bg-emerald-500 text-white hover:bg-emerald-600"
            >
              Add Another
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="size-4" />
          Back to Customers
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">Add Customer</h1>
        <p className="text-sm text-gray-500">
          Provision a new customer account. They will receive login credentials.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
        <div className="space-y-2">
          <Label htmlFor="full_name">Customer Name</Label>
          <Input id="full_name" placeholder="e.g. Ahmed Khan" {...register("full_name")} />
          {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Login Email</Label>
          <Input id="email" type="email" placeholder="ahmed@example.com" {...register("email")} />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fleet_name">Fleet Name</Label>
          <Input id="fleet_name" placeholder="e.g. Khan Enterprises" {...register("fleet_name")} />
          <p className="text-xs text-gray-400">This becomes their workspace name.</p>
          {errors.fleet_name && <p className="text-xs text-red-500">{errors.fleet_name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" placeholder="+92 300 1234567" {...register("phone")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="initial_password">Initial Password</Label>
          <div className="relative">
            <Input
              id="initial_password"
              type={showPassword ? "text" : "password"}
              placeholder="Min 8 characters"
              {...register("initial_password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.initial_password && <p className="text-xs text-red-500">{errors.initial_password.message}</p>}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-500 text-white hover:bg-emerald-600"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating Account...
            </>
          ) : (
            "Create Customer Account"
          )}
        </Button>
      </form>
    </div>
  )
}
