import { cn } from "@/client/lib/utils"

interface MultilinePlaceholderProps {
  placeholder?: string
  hasValue: boolean
  isFocused: boolean
  className?: string
}

function MultilinePlaceholder({
  placeholder,
  hasValue,
  isFocused,
  className
}: MultilinePlaceholderProps) {
  if (!placeholder || hasValue || isFocused) return null

  // 检查是否包含换行符
  const hasNewline = placeholder.includes('\n')
  if (!hasNewline) return null

  const lines = placeholder.split('\n')

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 px-3 py-2 text-muted-foreground text-base md:text-sm",
        className
      )}
    >
      {lines.map((line, index) => (
        <div key={index} className="leading-5">
          {line || '\u00A0'} {/* 空行使用不间断空格保持行高 */}
        </div>
      ))}
    </div>
  )
}

export { MultilinePlaceholder }
