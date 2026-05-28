import CoffeeIcon from "../../images/svg/Coffee";

export const EmptyComp = ({ height, opacity }: { height?: string; opacity?: string }) => {
    return (
        <div className={`flex flex-col justify-center items-center ${height} ${opacity}`}>
            <CoffeeIcon />
            <div className={`font-bold mr-2 ${opacity}`}>Empty</div>
        </div>
    );
};
