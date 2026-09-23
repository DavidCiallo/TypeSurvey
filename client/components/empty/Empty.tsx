import { Inbox, type LucideIcon } from "lucide-react";
import { Locale } from "../../methods/locale";

export const EmptyComp = ({
    className,
    text,
    icon: Icon = Inbox,
}: {
    className?: string;
    text?: string;
    icon?: LucideIcon;
}) => {
    const locale = Locale("Common");

    return (
        <div className={`flex flex-col items-center justify-center gap-2 py-8 ${className || ""}`}>
            <Icon className="text-muted-foreground/40 size-10" strokeWidth={1.5} />
            <div className="text-muted-foreground text-sm">{text ?? locale.Empty}</div>
        </div>
    );
};
