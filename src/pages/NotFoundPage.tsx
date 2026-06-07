import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/data/store'

export function NotFoundPage() {
  const currentUser = useAppStore((s) => s.currentUser)
  const home = !currentUser ? '/login' : currentUser.role === 'property' ? '/property/dashboard' : '/resident/payments'
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <Compass className="size-12 text-muted-foreground/40" />
      <div>
        <p className="text-2xl font-semibold">404</p>
        <p className="mt-1 text-sm text-muted-foreground">页面不存在或已被移动</p>
      </div>
      <Button asChild>
        <Link to={home}>返回首页</Link>
      </Button>
    </div>
  )
}
