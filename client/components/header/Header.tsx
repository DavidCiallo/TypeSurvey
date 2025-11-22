import { Button } from "@heroui/react";
import { MenuComp } from "./Menu";

type params = {
    name: string;
};

export const Header = ({ name }: params) => {
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
            <Button size="sm" variant="bordered" className="text-xs text-gray-500 w-16" onClick={changeLan}>
                {lan}
            </Button>
        );
    }
    return (
        <div className="w-full h-15 flex flex-row justify-between items-center border-b-1 border-gray-300">
            <div className="w-4/5 md:w-1/2 flex flex-row justify-start items-center">
                <MenuComp now={name} />
                <span className="ml-5 text-xl font-bold">{name}</span>
            </div>
            <div className="w-24 flex flex-row justify-start items-end">
                <Language />
            </div>
        </div>
    );
};
