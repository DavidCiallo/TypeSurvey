import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { cn } from "@/client/lib/utils"
import { Button } from "@/client/components/ui/button"

type PaginationProps = {
    page: number
    total: number
    onChange: (page: number) => void
    className?: string
}

function Pagination({ page, total, onChange, className }: PaginationProps) {
    if (total <= 1) return null

    const pages: (number | "...")[] = []
    if (total <= 5) {
        for (let i = 1; i <= total; i++) pages.push(i)
    } else {
        pages.push(1)
        if (page > 3) pages.push("...")
        for (let i = Math.max(2, page - 1); i <= Math.min(total - 1, page + 1); i++) {
            pages.push(i)
        }
        if (page < total - 2) pages.push("...")
        pages.push(total)
    }

    return (
        <nav className={cn("flex items-center gap-1", className)} role="navigation">
            <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => onChange(Math.max(1, page - 1))}
                disabled={page <= 1}
            >
                <ChevronLeft className="size-4" />
            </Button>
            {pages.map((p, i) =>
                p === "..." ? (
                    <span key={`e${i}`} className="text-muted-foreground px-1">
                        <MoreHorizontal className="size-4" />
                    </span>
                ) : (
                    <Button
                        key={p}
                        variant={p === page ? "default" : "outline"}
                        size="icon"
                        className="size-8"
                        onClick={() => onChange(p)}
                    >
                        {p}
                    </Button>
                )
            )}
            <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => onChange(Math.min(total, page + 1))}
                disabled={page >= total}
            >
                <ChevronRight className="size-4" />
            </Button>
        </nav>
    )
}

export { Pagination }
