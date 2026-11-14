import { Brand } from './Brand'
import { ModeSwitch } from './ModeSwitch'
import { TopBarActions } from './TopBarActions'

export function TopBar() {
  return (
    <header className="flex h-12 flex-none items-center gap-3.5 overflow-x-auto border-b bg-card px-3.5">
      <Brand />
      <ModeSwitch />
      <div className="flex-1" />
      <TopBarActions />
    </header>
  )
}
