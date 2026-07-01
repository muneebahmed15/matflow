import { LucideIcon } from 'lucide-react'
import { SpringButton } from '@/components/SpringButton'

interface Props {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; href: string }
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
        <Icon size={28} className="text-white/20" />
      </div>
      <p className="text-white/40 font-medium">{title}</p>
      {description && <p className="text-white/20 text-sm mt-1">{description}</p>}
      {action && (
        <SpringButton href={action.href} size="sm" className="mt-4">
          {action.label}
        </SpringButton>
      )}
    </div>
  )
}
