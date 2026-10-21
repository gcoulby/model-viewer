import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon } from 'lucide-react'
import type { LayoutDirection } from '@/types/view'

export function DirectionIcon({ direction }: { direction: LayoutDirection }) {
  switch (direction) {
    case 'TB':
      return <ArrowDownIcon />
    case 'BT':
      return <ArrowUpIcon />
    case 'LR':
      return <ArrowRightIcon />
    case 'RL':
      return <ArrowLeftIcon />
  }
}
