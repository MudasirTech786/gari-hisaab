import { UserMenu } from "@/components/user-menu"

interface AppNavbarProps {
  label: string
  isAdmin: boolean
}

export function AppNavbar({ label, isAdmin }: AppNavbarProps) {
  return (
    <header className="hidden h-16 border-b border-border bg-white/85 backdrop-blur-xl lg:block">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-end px-8">
        <UserMenu label={label} isAdmin={isAdmin} />
      </div>
    </header>
  )
}
