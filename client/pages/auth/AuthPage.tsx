"use client";

import { Button, Input, Form } from "@heroui/react";
import { AuthRouter } from "../../api/instance";
import { useNavigate } from "react-router-dom";
import { toast } from "../../methods/notify";
import { setAuthStatus, setUserInfo } from "../../methods/auth";
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

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(event.currentTarget));
        const email = data.email.toString();
        const password = data.password.toString();
        await login({ email, password });
    };

    async function login(auth: { email: string; password: string }) {
        const { success, data, message } = await AuthRouter.login(auth);
        if (!success || !data) {
            toast({ title: message || locale.LoginFailed, color: "danger" });
            return;
        }
        const { token } = data;
        toast({ title: locale.LoginSuccess, color: "success" });
        await new Promise((r) => setTimeout(r, 1000));
        setAuthStatus({ access_token: token, expires_in: 3600 });
        setUserInfo({ email: auth.email });
        navigate("/form");
    }

    return (
        <div className="flex h-full w-full items-center justify-center">
            <div className="rounded-large flex w-full max-w-sm flex-col gap-4 px-8 pt-[20vh]">
                <p className="pb-4 text-left text-3xl font-semibold">
                    <span aria-label="emoji" className="mr-4" role="img">
                        📝
                    </span>
                    {locale.Title}
                </p>
                <Form className="flex flex-col gap-4" validationBehavior="native" onSubmit={handleSubmit}>
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
            </div>
        </div>
    );
}
