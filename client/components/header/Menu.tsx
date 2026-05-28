import { Drawer, DrawerContent, DrawerHeader, DrawerBody, useDisclosure } from "@heroui/react";

import MenuIcon from "../icons/menu";
import { Link } from "react-router-dom";
import { Locale } from "../../methods/locale";

export const MenuComp = ({ now }: { now?: string }) => {
    const locale = Locale("Menu");
    const { isOpen, onOpen, onOpenChange } = useDisclosure();

    const menuList = [
        {
            name: locale.FormList,
            link: "/form",
        },
        {
            name: locale.FieldManage,
            link: "/field",
        },
        {
            name: locale.Feedback,
            link: "/record",
        },
    ];

    function renderBody(onClose: Function) {
        const list = menuList.map(({ name, link }) => {
            return (
                <div className="m-2 text-lg text-gray-700 cursor-pointer">
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
                        <span>{/* {localStorage.getItem("email")} */}</span>
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
            <Drawer isOpen={isOpen} onOpenChange={onOpenChange} className="rounded-none w-60 md:w-96" placement="left">
                <DrawerContent>{(onClose) => renderBody(onClose)}</DrawerContent>
            </Drawer>
        </>
    );
};
