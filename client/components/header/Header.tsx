
import { MenuComp } from "./Menu";

type params = {
    name: string;
}

export const Header = ({ name }: params) => {
    return (
        <div className="w-full h-15 flex flex-row justify-between items-center border-b-1 border-gray-300">
            <div className="w-4/5 md:w-1/2 flex flex-row justify-start items-center">
                <MenuComp now={name} />
                <span className="ml-5 text-xl font-bold">{name}</span>
            </div>
        </div>
    )
}