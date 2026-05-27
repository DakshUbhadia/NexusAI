import Link from 'next/link'

import { Lock } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function AccessDenied() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-(--bg-base) px-6 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-(--border-default) bg-(--bg-surface)">
          <Lock className="size-5 text-(--text-secondary)" />
        </div>
        <h1 className="text-xl font-semibold text-(--text-primary)">Access denied</h1>
        <p className="text-sm text-(--text-secondary)">
          You do not have permission to view this workspace.
        </p>
        <Button asChild>
          <Link href="/editor">Back to projects</Link>
        </Button>
      </div>
    </main>
  )
}
