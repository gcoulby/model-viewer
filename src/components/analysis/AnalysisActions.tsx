import { ChevronDownIcon, DownloadIcon } from 'lucide-react'
import { FileMenu } from '@/components/topbar/FileMenu'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { useAnalysis } from '@/hooks/useAnalysis'
import { downloadBlob } from '@/lib/download'
import { reportHtml, reportMarkdown } from '@/lib/analysis/report'

/** Analysis mode's top bar: opening files, and the report as a download. */
export function AnalysisActions() {
  const analysis = useAnalysis()
  const base = analysis ? `${analysis.report.files[0]?.split('/').pop()?.replace(/\.ecore$/i, '') ?? 'metamodel'}-analysis` : 'analysis'
  return (
    <>
      <FileMenu />
      <Separator orientation="vertical" className="mx-1 hidden h-5 md:block" />
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button disabled={!analysis} />}>
          <DownloadIcon />
          Report
          <ChevronDownIcon className="opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => analysis && downloadBlob(`${base}.html`, new Blob([reportHtml(analysis.report)], { type: 'text/html' }))}>
            HTML page
            <span className="ml-auto text-xs text-muted-foreground">.html</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => analysis && downloadBlob(`${base}.md`, new Blob([reportMarkdown(analysis.report)], { type: 'text/markdown' }))}>
            Markdown
            <span className="ml-auto text-xs text-muted-foreground">.md</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => analysis && void navigator.clipboard.writeText(reportMarkdown(analysis.report))}>Copy as Markdown</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
