import { Button } from "@heroui/react";
import { AuthStatus, getAuthStatus } from "../../methods/auth";
import { Locale } from "../../methods/locale";

const Component = () => {
    const locale = Locale("HomePage");
    const Logo = () => (
        <span className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-gray-900">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="32" height="32" className="shrink-0">
                <defs>
                    <linearGradient id="home-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: "#3B82F6" }} />
                        <stop offset="100%" style={{ stopColor: "#2563EB" }} />
                    </linearGradient>
                </defs>
                <rect width="64" height="64" rx="14" fill="url(#home-bg)" />
                <rect x="10" y="10" width="21" height="4" rx="2" fill="#fff" opacity="0.9" />
                <rect x="10" y="22" width="44" height="4" rx="2" fill="#fff" opacity="0.9" />
                <rect x="10" y="34" width="44" height="4" rx="2" fill="#fff" opacity="0.9" />
                <rect x="10" y="46" width="33" height="4" rx="2" fill="#fff" opacity="0.9" />
                <circle cx="50" cy="48" r="4" fill="#fff" />
            </svg>
            简表
        </span>
    );
    const auth = getAuthStatus();

    function changeLan() {
        const lanList = ["cn", "en"];
        const locale = localStorage.getItem("locale") || "cn";
        const index = lanList.indexOf(locale);
        const nextIndex = (index + 1) % lanList.length;
        localStorage.setItem("locale", lanList[nextIndex]);
        window.location.reload();
    }
    function Language() {
        const locale = localStorage.getItem("locale") || "cn";
        let lan = "";
        switch (locale) {
            case "cn":
                lan = "中文";
                break;
            case "en":
                lan = "EN";
                break;
            default:
                lan = "中文";
        }
        return (
            <Button size="sm" variant="bordered" className="text-xs text-gray-600 w-16 border-gray-300 hover:border-blue-400 hover:text-blue-600" onClick={changeLan}>
                {lan}
            </Button>
        );
    }
    return (
        <div className="h-screen relative isolate overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-sky-50 pt-10">
            <header className="absolute inset-x-0 top-0 z-50">
                <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
                    <div className="flex lg:flex-1">
                        <a href="#" className="-m-1.5 p-1.5">
                            <span className="sr-only">简表</span>
                            <Logo />
                        </a>
                    </div>
                    <div className="flex flex-row flex-between items-center gap-4">
                        {auth !== AuthStatus.AUTH && (
                            <div className="lg:flex lg:flex-1 lg:justify-end">
                                <a href="/auth" className="text-sm font-semibold leading-6 text-gray-700 hover:text-blue-600 transition-colors">
                                    Log in
                                </a>
                            </div>
                        )}
                        <Language />
                    </div>
                </nav>
            </header>

            <div className="mx-auto max-w-7xl px-6 py-24 sm:py-24 lg:pb-40 lg:pt-40">
                <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
                    <div className="mx-auto max-w-2xl lg:mx-0 lg:col-span-6 lg:flex lg:flex-col lg:justify-center">
                        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                            {locale.MainText1}
                            <span className="text-blue-600">{locale.MainText2}</span>
                            {locale.MainText3}
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-gray-500">{locale.Slogan1}</p>
                        <p className="text-lg leading-8 text-gray-500">{locale.Slogan2}</p>
                        <p className="mt-6 text-md leading-8 text-gray-400">Powered by React. </p>

                        <div className="mt-10 flex items-center gap-x-6">
                            <a
                                href="/form"
                                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline"
                            >
                                Start Free
                            </a>

                            <a
                                href="https://github.com/DavidCiallo/TypeForm"
                                target="_blank"
                                className="text-sm font-semibold leading-6 text-gray-700 hover:text-blue-600 transition-colors"
                            >
                                {locale.ViewSource} <span>→</span>
                            </a>
                        </div>
                    </div>

                    <div className="relative mt-16 lg:col-span-6 lg:mt-0 flex justify-center items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 200" className="w-96 h-[26rem] drop-shadow-xl">
                            <defs>
                                <linearGradient id="form-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: "#ffffff" }} />
                                    <stop offset="100%" style={{ stopColor: "#EBF4FF" }} />
                                </linearGradient>
                            </defs>
                            <rect width="160" height="200" rx="16" fill="url(#form-bg)" stroke="#BFDBFE" strokeWidth="1.5"/>
                            <rect x="30" y="28" width="100" height="10" rx="3" fill="#BFDBFE"/>
                            <rect x="20" y="50" width="120" height="6" rx="2" fill="#DBEAFE"/>
                            <rect x="20" y="64" width="80" height="6" rx="2" fill="#DBEAFE"/>
                            <rect x="20" y="78" width="120" height="6" rx="2" fill="#DBEAFE"/>
                            <rect x="20" y="92" width="100" height="6" rx="2" fill="#DBEAFE"/>
                            <rect x="20" y="106" width="120" height="6" rx="2" fill="#DBEAFE"/>
                            <rect x="20" y="120" width="80" height="6" rx="2" fill="#DBEAFE"/>
                            <rect x="20" y="134" width="100" height="6" rx="2" fill="#DBEAFE"/>
                            <rect x="40" y="160" width="80" height="16" rx="8" fill="#3B82F6" opacity="0.8"/>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Component;
