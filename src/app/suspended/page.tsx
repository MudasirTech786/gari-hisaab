"use client"

import { AlertTriangle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { logoutAction } from "@/app/actions/auth"
import { useTransition } from "react"

export default function SuspendedPage() {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] px-4 text-foreground">
      <div className="max-w-md text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-red-400/10 border border-red-400/20">
          <AlertTriangle className="size-8 text-red-400" />
        </div>

        <h1 className="mt-6 text-2xl font-bold">Account Suspended</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Your workspace has been suspended by the platform administrator.
          You will not be able to access your fleet data until your account is reactivated.
        </p>

        <p className="mt-4 text-sm text-muted-foreground">
          If you believe this is an error, please contact the platform administrator.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <a href="mailto:support@garihisaab.com">
            <Button variant="outline" className="w-full bg-white">
              <Mail className="size-4" />
              Contact Support
            </Button>
          </a>
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            disabled={isPending}
            onClick={() => startTransition(async () => { await logoutAction() })}
          >
            {isPending ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>
    </div>
  )
}
