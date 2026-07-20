import { Button } from "@/client/components/ui/button";
import {
    Dialog,
    DialogContent,
} from "@/client/components/ui/dialog";
import { Locale } from "../../methods/locale";

interface Prop {
    value: string;
    change: (code: string) => void;
}

const Component = ({ value, change }: Prop) => {
    const locale = Locale("CheckModal");

    function NumChoose() {
        return (
            <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-1">
                    {new Array(5).fill("").map((_, i) => (
                        <Button key={i} variant="outline" size="icon" onClick={() => change(value + ((i + 1) % 10))}>
                            {(i + 1) % 10}
                        </Button>
                    ))}
                </div>
                <div className="flex flex-row gap-1">
                    {new Array(5).fill("").map((_, i) => (
                        <Button key={i} variant="outline" size="icon" onClick={() => change(value + ((i + 6) % 10))}>
                            {(i + 6) % 10}
                        </Button>
                    ))}
                </div>
            </div>
        );
    }

    const otpDisplay = (
        <div className="flex gap-2">
            {new Array(4).fill("").map((_, i) => (
                <div
                    key={i}
                    className="border-input flex h-10 w-10 items-center justify-center rounded-md border text-lg font-medium"
                >
                    {value[i] || ""}
                </div>
            ))}
        </div>
    );

    return (
        <Dialog open>
            <DialogContent className="sm:max-w-xs">
                <div className="flex flex-col items-center gap-4">
                    <div className="mt-2 text-center font-bold">{locale.Title}</div>
                    {otpDisplay}
                    <NumChoose />
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default Component;
