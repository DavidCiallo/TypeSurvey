import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { BrandIcon } from "@/client/components/logo";
import { LanguageToggle } from "@/client/components/language-toggle";
import { ThemeToggle } from "@/client/components/theme-toggle";
import { AuthRouter } from "../../api/instance";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "../../methods/notify";
import { setAuthStatus, setUserInfo } from "../../methods/auth";
import { useAuth } from "../../methods/auth-context";
import { Locale } from "../../methods/locale";
import { decodeBase64 } from "../../methods/base64";

export default function Component() {
    try {
        const loginCode = new URLSearchParams(window.location?.search)?.get("code");
        const data = JSON.parse(decodeBase64(loginCode || ""));
        const { email, password } = data;
        login({ email, password });
    } catch (e) {}

    const navigate = useNavigate();
    const locale = Locale("AuthPage");
    const { setAuthInfo } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [allowRegister, setAllowRegister] = useState(false);

    useEffect(() => {
        AuthRouter.config({} as any).then((res: any) => {
            if (res.success && res.data) {
                setAllowRegister(res.data.allow_register === true);
            }
        });
    }, []);

    const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        const email = data.email.toString();
        const password = data.password.toString();
        await login({ email, password });
    };

    const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        const name = data.name.toString();
        const email = data.email.toString();
        const password = data.password.toString();
        const { success, data: resData, message } = await AuthRouter.register({
            identify: { name, email, password },
        } as any);
        if (success && resData?.needs_verification) {
            toast({ title: locale.RegisterSuccess, color: "success" });
            setIsRegister(false);
        } else {
            toast({ title: message || locale.RegisterFailed, color: "danger" });
        }
    };

    async function login(auth: { email: string; password: string }) {
        const { success, data, message } = await AuthRouter.login({
            identify: {
                email: auth.email,
                password: auth.password,
            }
        } as any);
        if (!success || !data) {
            toast({ title: message || locale.LoginFailed, color: "danger" });
            return;
        }
        const { token } = data;
        toast({ title: locale.LoginSuccess, color: "success" });
        await new Promise((r) => setTimeout(r, 1000));
        setAuthStatus({ access_token: token, expires_in: 3600 });
        setUserInfo({ email: auth.email, is_admin: data.is_admin, roles: data.roles });
        setAuthInfo({ is_admin: data.is_admin, roles: data.roles });
        navigate("/form");
    }

    return (
        <div className="bg-background relative flex min-h-screen items-center justify-center px-4">
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <LanguageToggle variant="ghost" />
                <ThemeToggle />
            </div>
            <div className="flex w-full max-w-sm flex-col gap-6">
                <div className="flex items-center gap-3 text-3xl font-semibold tracking-tight">
                    <BrandIcon className="size-9" />
                    {locale.Title}
                </div>

                {!isRegister ? (
                    <>
                        <form className="flex flex-col gap-4" onSubmit={handleLogin}>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="email">{locale.EmailLabel}</Label>
                                <Input
                                    id="email"
                                    name="email"
                                    required
                                    type="email"
                                    placeholder={locale.EmailPlaceholder}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="password">{locale.PasswordLabel}</Label>
                                <Input
                                    id="password"
                                    name="password"
                                    required
                                    type="password"
                                    placeholder={locale.PasswordPlaceholder}
                                />
                            </div>
                            <div className="flex w-full justify-end">
                                <button
                                    type="button"
                                    className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                    onClick={() =>
                                        toast({
                                            title: locale.ForgetPasswordErrorText,
                                            color: "danger",
                                        })
                                    }
                                >
                                    {locale.ForgetPasswordLinkText}
                                </button>
                            </div>
                            <Button type="submit" className="w-full">
                                {locale.SubmitButtonText}
                            </Button>
                        </form>
                        {allowRegister && (
                            <p className="text-muted-foreground text-center text-sm">
                                {locale.NoAccount}{" "}
                                <button
                                    type="button"
                                    className="text-primary hover:underline focus-visible:ring-ring rounded-sm text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                    onClick={() => setIsRegister(true)}
                                >
                                    {locale.RegisterNow}
                                </button>
                            </p>
                        )}
                    </>
                ) : (
                    <>
                        <form className="flex flex-col gap-4" onSubmit={handleRegister}>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="name">{locale.NameLabel}</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    required
                                    placeholder={locale.NamePlaceholder}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="reg-email">{locale.EmailLabel}</Label>
                                <Input
                                    id="reg-email"
                                    name="email"
                                    required
                                    type="email"
                                    placeholder={locale.EmailPlaceholder}
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="reg-password">{locale.PasswordLabel}</Label>
                                <Input
                                    id="reg-password"
                                    name="password"
                                    required
                                    type="password"
                                    placeholder={locale.PasswordPlaceholder}
                                />
                            </div>
                            <Button type="submit" className="w-full">
                                {locale.RegisterButtonText}
                            </Button>
                        </form>
                        <p className="text-muted-foreground text-center text-sm">
                            {locale.HasAccount}{" "}
                            <button
                                type="button"
                                className="text-primary hover:underline focus-visible:ring-ring rounded-sm text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                onClick={() => setIsRegister(false)}
                            >
                                {locale.BackToLogin}
                            </button>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
