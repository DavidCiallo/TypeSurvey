import { Button } from "@heroui/react";
import { AuthStatus, getAuthStatus } from "../../methods/auth";
import { Locale } from "../../methods/locale";

const Component = () => {
    const locale = Locale("HomePage");
    const Logo = () => <span className="text-2xl font-bold tracking-tight text-white">QuickForm</span>;
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
            <Button size="sm" variant="bordered" className="text-xs text-white w-16" onClick={changeLan}>
                {lan}
            </Button>
        );
    }
    return (
        <div className="h-screen relative isolate overflow-hidden bg-gray-800 pt-10">
            <header className="absolute inset-x-0 top-0 z-50">
                <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
                    <div className="flex lg:flex-1">
                        <a href="#" className="-m-1.5 p-1.5">
                            <span className="sr-only">QuickForm</span>
                            <Logo />
                        </a>
                    </div>
                    <div className="flex flex-row flex-between items-center gap-4">
                        {auth !== AuthStatus.AUTH && (
                            <div className="hidden lg:flex lg:flex-1 lg:justify-end">
                                <a href="/auth" className="text-sm font-semibold leading-6 text-white">
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
                        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                            {locale.MainText1}
                            <span className="text-indigo-400">{locale.MainText2}</span>
                            {locale.MainText3}
                        </h1>
                        <p className="mt-6 text-lg leading-8 text-gray-300">{locale.Slogan1}</p>
                        <p className="text-lg leading-8 text-gray-300">{locale.Slogan2}</p>
                        <p className="mt-6 text-md leading-8 text-gray-300">Powered by React. </p>

                        <div className="mt-10 flex items-center gap-x-6">
                            <a
                                href="/form"
                                className="rounded-md bg-indigo-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline"
                            >
                                Start Free
                            </a>

                            <a
                                href="https://github.com/DavidCiallo/Quick-Form"
                                target="_blank"
                                className="text-sm font-semibold leading-6 text-white"
                            >
                                {locale.ViewSource} <span aria-hidden="true">→</span>
                            </a>
                        </div>
                    </div>

                    <div className="relative mt-16 lg:col-span-6 lg:mt-0">
                        <div className="relative rounded-xl bg-gray-800 p-6 shadow-xl ring-1 ring-white/10">
                            <div className="flex space-x-2 text-white">
                                <span className="h-3 w-3 rounded-full bg-red-500"></span>
                                <span className="h-3 w-3 rounded-full bg-yellow-400"></span>
                                <span className="h-3 w-3 rounded-full bg-green-500"></span>
                            </div>
                            <pre className="mt-4 overflow-x-auto text-sm overflow-x-hidden">
                                <code className="text-indigo-400">
                                    {`import { FormProvider, useForm } from 'formflow';\n\nconst MySurvey = ({ formId }) => {\n  const { submit } = useForm(formId);\n  \n  return (\n    <div className="p-8 bg-white/5 rounded-lg">\n      <h2 className="text-xl text-white">FeedBack Table</h2>\n      <FormProvider formId={formId}>\n        {/* ... form fields ... */}\n        <button onClick={submit} className="m-2 text-white rounded">\n          Submit\n        </button>\n      </FormProvider>\n    </div>\n  );\n};`}
                                </code>
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Component;
