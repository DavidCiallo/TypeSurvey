import { cn } from "@/client/lib/utils";

export function BrandIcon({ className }: { className?: string }) {
    return (
        <svg
            className={cn("shrink-0", className)}
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <rect width="32" height="32" rx="8" fill="currentColor" />
            <rect x="8" y="8" width="10" height="3" rx="1.5" style={{ fill: "var(--background)" }} />
            <rect x="8" y="14.5" width="16" height="3" rx="1.5" style={{ fill: "var(--background)" }} opacity="0.8" />
            <rect x="8" y="21" width="13" height="3" rx="1.5" style={{ fill: "var(--background)" }} opacity="0.6" />
        </svg>
    );
}
