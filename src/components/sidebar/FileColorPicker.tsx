import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useFileColors } from '@/hooks/useFileColors'
import { useTheme } from '@/hooks/useTheme'
import { dotColor, HUE_CHOICES } from '@/lib/ecore/paint'
import { cn } from '@/lib/utils'

/** A colour swatch that opens a menu of hues for one file. */
export function FileColorPicker({ fileKey, fileName }: { fileKey: string; fileName: string }) {
  const { theme } = useTheme()
  const { hueFor, setHue, resetHue, isCustom } = useFileColors()
  const dark = theme === 'dark'
  const current = hueFor(fileKey)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-xs" aria-label={`Colour of ${fileName}`} className="size-6" />}
      >
        <i className="size-3 rounded-full" style={{ background: dotColor(current, dark) }} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto">
        <div className="grid grid-cols-6 gap-1 p-1">
          {HUE_CHOICES.map((hue) => (
            <DropdownMenuItem
              key={hue}
              aria-label={`Hue ${hue}`}
              onClick={() => setHue(fileKey, hue)}
              className={cn('size-6 justify-center rounded-full p-0', hue === current && 'ring-2 ring-foreground')}
              style={{ background: dotColor(hue, dark) }}
            />
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!isCustom(fileKey)} onClick={() => resetHue(fileKey)}>
          Reset to automatic
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
