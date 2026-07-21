import { Button } from "@/client/components/ui/button";
import { BrandIcon } from "@/client/components/logo";
import { LanguageToggle } from "@/client/components/language-toggle";
import { ThemeToggle } from "@/client/components/theme-toggle";
import { AuthStatus, getAuthStatus } from "../../methods/auth";
import { Locale } from "../../methods/locale";

const Component = () => {
    const locale = Locale("HomePage");
    const appName = Locale("Common").AppName;
    const Logo = () => (
        <span className="text-foreground flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <BrandIcon className="size-9" />
            {appName}
        </span>
    );
    const auth = getAuthStatus();

    return (
        <div className="bg-background relative min-h-screen overflow-hidden pt-10">
            <header className="absolute inset-x-0 top-0 z-50">
                <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
                    <div className="flex lg:flex-1">
                        <a href="#" className="-m-1.5 p-1.5">
                            <span className="sr-only">{appName}</span>
                            <Logo />
                        </a>
                    </div>
                    <div className="flex flex-row items-center gap-2">
                        {auth !== AuthStatus.AUTH && (
                            <div className="lg:flex lg:flex-1 lg:justify-end">
                                <a
                                    href="/auth"
                                    className="text-muted-foreground hover:text-foreground mr-2 text-sm font-semibold leading-6 transition-colors"
                                >
                                    Log in
                                </a>
                            </div>
                        )}
                        <LanguageToggle variant="ghost" />
                        <ThemeToggle />
                    </div>
                </nav>
            </header>

            <div className="mx-auto max-w-7xl px-6 py-24 sm:py-24 lg:pb-40 lg:pt-40">
                <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
                    <div className="mx-auto max-w-2xl lg:col-span-6 lg:mx-0 lg:flex lg:flex-col lg:justify-center">
                        <h1 className="text-foreground text-4xl font-bold tracking-tight sm:text-6xl">
                            {locale.MainText1}
                            <span className="text-primary">{locale.MainText2}</span>
                            {locale.MainText3}
                        </h1>
                        <p className="text-muted-foreground mt-6 text-lg leading-8">{locale.Slogan1}</p>
                        <p className="text-muted-foreground text-lg leading-8">{locale.Slogan2}</p>
                        <p className="text-muted-foreground/70 mt-6 text-md leading-8">Powered by React.</p>

                        <div className="mt-10 flex items-center gap-x-6">
                            <a href="/form">
                                <Button>Start Free</Button>
                            </a>
                            <a
                                href="https://github.com/DavidCiallo/TypeForm"
                                target="_blank"
                                className="text-muted-foreground hover:text-foreground text-sm font-semibold leading-6 transition-colors"
                            >
                                {locale.ViewSource} <span>→</span>
                            </a>
                        </div>
                    </div>

                    {/* Right side abstract geometric pattern */}
                    <div className="relative hidden lg:col-span-6 lg:block">
                        <div className="relative flex h-full min-h-[420px] items-center justify-center">
                            {/* Concentric circles */}
                            <div className="border-foreground/10 absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border-2" />
                            <div className="border-foreground/[0.06] absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full border" />

                            {/* Form card - main */}
                            <div className="bg-card border-border/60 absolute top-1/2 left-1/2 w-52 -translate-x-1/2 -translate-y-1/2 rounded-xl border p-4 shadow-lg">
                                <div className="bg-foreground/80 mb-3 h-2.5 w-20 rounded-full" />
                                <div className="border-border/80 bg-background mb-2 h-8 w-full rounded-md border" />
                                <div className="border-border/80 bg-background mb-2 h-8 w-full rounded-md border" />
                                <div className="flex gap-2">
                                    <div className="border-border/80 bg-background h-4 w-4 rounded border" />
                                    <div className="bg-foreground/20 h-4 w-16 rounded" />
                                </div>
                                <div className="mt-2 flex gap-2">
                                    <div className="bg-foreground/80 h-4 w-4 rounded-full" />
                                    <div className="bg-foreground/20 h-4 w-12 rounded" />
                                </div>
                            </div>

                            {/* Floating card - top left */}
                            <div className="bg-card border-border/40 absolute top-8 left-6 w-32 rounded-lg border p-3 shadow-md">
                                <div className="bg-foreground/60 mb-2 h-2 w-12 rounded-full" />
                                <div className="bg-foreground/15 h-2 w-full rounded-full" />
                            </div>

                            {/* Floating card - bottom right */}
                            <div className="bg-card border-border/40 absolute right-4 bottom-12 w-36 rounded-lg border p-3 shadow-md">
                                <div className="mb-2 flex items-center gap-2">
                                    <div className="bg-foreground/70 h-3 w-3 rounded-sm" />
                                    <div className="bg-foreground/20 h-2 w-14 rounded-full" />
                                </div>
                                <div className="bg-foreground/10 h-6 w-full rounded" />
                            </div>

                            {/* Geometric dots */}
                            <div className="bg-foreground/20 absolute top-16 right-16 h-3 w-3 rounded-full" />
                            <div className="bg-foreground/10 absolute bottom-24 left-12 h-4 w-4 rounded-sm" />
                            <div className="border-foreground/20 absolute top-32 left-16 h-5 w-5 rotate-45 border" />
                            <div className="bg-foreground/15 absolute right-20 bottom-32 h-2.5 w-2.5 rounded-full" />
                            <div className="bg-foreground/[0.08] absolute top-20 left-1/3 h-6 w-6 rounded-full" />

                            {/* Cross marks */}
                            <div className="absolute top-40 right-10 text-foreground/15">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M8 0v16M0 8h16" stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                            </div>
                            <div className="absolute bottom-16 left-1/4 text-foreground/10">
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                    <path d="M8 0v16M0 8h16" stroke="currentColor" strokeWidth="1.5" />
                                </svg>
                            </div>

                            {/* Arc decorations */}
                            <svg
                                className="absolute top-6 right-1/4 text-foreground/[0.07]"
                                width="80"
                                height="80"
                                viewBox="0 0 80 80"
                                fill="none"
                            >
                                <path d="M0 80A80 80 0 0 1 80 0" stroke="currentColor" strokeWidth="2" />
                            </svg>
                            <svg
                                className="absolute bottom-8 left-8 text-foreground/[0.07]"
                                width="60"
                                height="60"
                                viewBox="0 0 60 60"
                                fill="none"
                            >
                                <path d="M60 0A60 60 0 0 0 0 60" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Component;
