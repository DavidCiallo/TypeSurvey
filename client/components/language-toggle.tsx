import { type ComponentProps } from "react";
import { Languages } from "lucide-react";

import { Button } from "@/client/components/ui/button";

export function changeLanguage() {
    const lanList = ["cn", "en"];
    const current = localStorage.getItem("locale") || "cn";
    const index = lanList.indexOf(current);
    const nextIndex = (index + 1) % lanList.length;
    localStorage.setItem("locale", lanList[nextIndex]);
    window.location.reload();
}

export function LanguageToggle({
    variant = "outline",
    size = "sm",
    ...props
}: ComponentProps<typeof Button>) {
    const current = localStorage.getItem("locale") || "cn";
    const label = current === "cn" ? "中文" : "EN";

    return (
        <Button variant={variant} size={size} onClick={changeLanguage} {...props}>
            <Languages className="size-4" />
            <span>{label}</span>
        </Button>
    );
}
