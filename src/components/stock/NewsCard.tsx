'use client'

import { Newspaper, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { NewsItem } from '@/types/signal'

interface NewsCardProps {
  items?: NewsItem[]
}

export function NewsCard({ items }: NewsCardProps) {
  if (!items || items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Newspaper className="h-5 w-5 text-amber-500" />
            相關新聞
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">暫無相關新聞</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Newspaper className="h-5 w-5 text-amber-500" />
          相關新聞
          <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
            鉅亨網 · 15 分鐘快取
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, idx) => (
          <a
            key={idx}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-md border border-transparent p-2 transition-colors hover:border-border hover:bg-muted/50"
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-xs font-mono text-muted-foreground">
                {idx + 1}.
              </span>
              <div className="flex-1 space-y-1">
                <p className="text-sm leading-snug group-hover:text-primary">
                  {item.title}
                  <ExternalLink className="ml-1 inline h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {item.source && <span>{item.source}</span>}
                  {item.source && item.published && <span>·</span>}
                  {item.published && <span>{item.published}</span>}
                </div>
              </div>
            </div>
          </a>
        ))}
      </CardContent>
    </Card>
  )
}
