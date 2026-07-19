"use client";

import { Button, Input, Form } from "@heroui/react";
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
        <div className="flex h-full w-full items-center justify-center">
            <div className="rounded-large flex w-full max-w-sm flex-col gap-4 px-8 pt-[20vh]">
                <p className="pb-4 text-left text-3xl font-semibold flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="40" height="40" className="shrink-0">
                        <defs>
                            <linearGradient id="auth-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style={{ stopColor: "#3B82F6" }} />
                                <stop offset="100%" style={{ stopColor: "#2563EB" }} />
                            </linearGradient>
                        </defs>
                        <rect width="64" height="64" rx="14" fill="url(#auth-bg)" />
                        <rect x="10" y="10" width="21" height="4" rx="2" fill="#fff" opacity="0.9" />
                        <rect x="10" y="22" width="44" height="4" rx="2" fill="#fff" opacity="0.9" />
                        <rect x="10" y="34" width="44" height="4" rx="2" fill="#fff" opacity="0.9" />
                        <rect x="10" y="46" width="33" height="4" rx="2" fill="#fff" opacity="0.9" />
                        <circle cx="50" cy="48" r="4" fill="#fff" />
                    </svg>
                    {locale.Title}
                </p>

                {!isRegister ? (
                    <>
                        <Form className="flex flex-col gap-4" validationBehavior="native" onSubmit={handleLogin}>
                            <Input
                                isRequired
                                label={locale.EmailLabel}
                                labelPlacement="outside"
                                name="email"
                                placeholder={locale.EmailPlaceholder}
                                type="email"
                                variant="bordered"
                                errorMessage={() => locale.EmailError}
                            />
                            <Input
                                isRequired
                                label={locale.PasswordLabel}
                                labelPlacement="outside"
                                name="password"
                                placeholder={locale.PasswordPlaceholder}
                                type="password"
                                variant="bordered"
                                errorMessage={() => locale.PasswordError}
                            />
                            <div className="flex w-full items-center justify-end">
                                <div
                                    className="text-default-500 text-sm cursor-pointer"
                                    onClick={() =>
                                        toast({
                                            title: locale.ForgetPasswordErrorText,
                                            color: "danger",
                                        })
                                    }
                                >
                                    {locale.ForgetPasswordLinkText}
                                </div>
                            </div>
                            <Button className="w-full" color="primary" type="submit">
                                {locale.SubmitButtonText}
                            </Button>
                        </Form>
                        {allowRegister && (
                            <p className="text-center text-sm text-gray-500">
                                {locale.NoAccount}{" "}
                                <span className="text-primary cursor-pointer text-sm" onClick={() => setIsRegister(true)}>
                                    {locale.RegisterNow}
                                </span>
                            </p>
                        )}
                    </>
                ) : (
                    <>
                        <Form className="flex flex-col gap-4" validationBehavior="native" onSubmit={handleRegister}>
                            <Input
                                isRequired
                                label={locale.NameLabel}
                                labelPlacement="outside"
                                name="name"
                                placeholder={locale.NamePlaceholder}
                                variant="bordered"
                            />
                            <Input
                                isRequired
                                label={locale.EmailLabel}
                                labelPlacement="outside"
                                name="email"
                                placeholder={locale.EmailPlaceholder}
                                type="email"
                                variant="bordered"
                                errorMessage={() => locale.EmailError}
                            />
                            <Input
                                isRequired
                                label={locale.PasswordLabel}
                                labelPlacement="outside"
                                name="password"
                                placeholder={locale.PasswordPlaceholder}
                                type="password"
                                variant="bordered"
                                errorMessage={() => locale.PasswordError}
                            />
                            <Button className="w-full" color="primary" type="submit">
                                {locale.RegisterButtonText}
                            </Button>
                        </Form>
                        <p className="text-center text-sm text-gray-500">
                            {locale.HasAccount}{" "}
                            <span className="text-primary cursor-pointer text-sm" onClick={() => setIsRegister(false)}>
                                {locale.BackToLogin}
                            </span>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
