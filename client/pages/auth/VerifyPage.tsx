"use client";

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AuthRouter } from "../../api/instance";
import { toast } from "../../methods/notify";

export default function Component() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    useEffect(() => {
        if (!token) {
            navigate("/auth", { replace: true });
            return;
        }
        AuthRouter.verify({ token } as any).then(({ success, data, message }: any) => {
            if (success) {
                toast({ title: "邮箱验证成功，请登录", color: "success" });
                navigate("/auth", { replace: true });
            } else {
                toast({ title: message || "验证失败，链接可能已过期", color: "danger" });
                navigate("/auth", { replace: true });
            }
        });
    }, [token]);

    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <p className="text-lg">正在验证邮箱...</p>
            </div>
        </div>
    );
}
