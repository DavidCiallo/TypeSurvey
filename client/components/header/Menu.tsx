import { Drawer, DrawerContent, DrawerHeader, DrawerBody, useDisclosure } from "@heroui/react";

import MenuIcon from "../icons/menu";
import { Link, useNavigate } from "react-router-dom";
import { Locale } from "../../methods/locale";
import { useAuth } from "../../methods/auth-context";
import { clearAuthData } from "../../methods/auth";

const ALL_MENUS = ["form", "field", "record", "settings"] as const;

export const MenuComp = ({ now }: { now?: string }) => {
    const locale = Locale("Menu");
    const { isOpen, onOpen, onOpenChange } = useDisclosure();
    const { is_admin, roles, resetAuth } = useAuth();
    const navigate = useNavigate();

    const menuMap: Record<string, { name: string; link: string }> = {
        form: { name: locale.FormList, link: "/form" },
        field: { name: locale.FieldManage, link: "/field" },
        record: { name: locale.Feedback, link: "/record" },
        settings: { name: locale.AppSetting, link: "/settings" },
    };

    const menuKeys = is_admin
        ? ALL_MENUS
        : (roles.length > 0
            ? roles.filter(r => r.type === "menu").map(r => r.name)
            : []);
    const menuList = menuKeys
        .filter((key): key is string => key in menuMap)
        .sort((a, b) => ALL_MENUS.indexOf(a as any) - ALL_MENUS.indexOf(b as any))
        .map(key => menuMap[key]);

    function handleLogout() {
        clearAuthData();
        resetAuth();
        navigate("/auth", { replace: true });
    }

    function renderBody(onClose: Function) {
        const list = menuList.map(({ name, link }) => {
            return (
                <div className="m-2 text-lg text-gray-700 cursor-pointer" key={name}>
                    <Link to={link} onClick={() => onClose()}>
                        <div className={`mr-1 w-full ${now == name ? "text-primary" : ""}`}>{name}</div>
                    </Link>
                </div>
            );
        });
        return (
            <>
                <DrawerHeader className="flex flex-col gap-1">Menu</DrawerHeader>
                <DrawerBody className="h-screen flex flex-col justify-between">
                    <div className="flex flex-col justify-start items-start">{list}</div>
                    <div className="flex flex-row justify-start items-center h-20">
                        <div className="m-2 text-lg text-red-500 cursor-pointer" onClick={() => { onClose(); handleLogout(); }}>
                            {locale.Logout}
                        </div>
                    </div>
                </DrawerBody>
            </>
        );
    }
    return (
        <>
            <div className="w-15 h-12 flex items-center justify-center cursor-pointer" onClick={onOpen}>
                <MenuIcon />
            </div>
            <Drawer isOpen={isOpen} onOpenChange={onOpenChange} className="rounded-none w-80" placement="left">
                <DrawerContent>{(onClose) => renderBody(onClose)}</DrawerContent>
            </Drawer>
        </>
    );
};
