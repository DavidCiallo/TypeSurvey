import { useRef } from "react";
import { Button } from "@/client/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { RadioCreateRequest, RadioUpdateRequest } from "../../../shared/modules/radio/radio.interface";
import { toast } from "../../methods/notify";
import { Locale } from "../../methods/locale";

interface props {
    field_id: string | null;
    isOpen: boolean;
    onOpenChange: any;
    onSubmit: (data: RadioCreateRequest | RadioUpdateRequest) => void;
}

const RadioEditorModal = ({ field_id, isOpen, onOpenChange, onSubmit }: props) => {
    const locale = Locale("FormFieldRadioEditor");
    const formRef = useRef<HTMLFormElement>(null);

    const handleCustomSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
        if (event) {
            event.preventDefault();
            return;
        }
        if (!field_id) {
            return;
        }
        const { radio_name } = Object.fromEntries(new FormData(formRef.current!).entries());
        if (!radio_name) {
            return toast({
                title: locale.CreateRadioFailed,
                color: "danger",
            });
        }

        onSubmit({ field_id: field_id, radio_name: radio_name.toString() });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader />
                <form ref={formRef} onSubmit={handleCustomSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label>{locale.Title}</Label>
                        <Input name="radio_name" placeholder={locale.Title} />
                    </div>
                </form>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {Locale("Common").ButtonClose}
                    </Button>
                    <Button onClick={() => handleCustomSubmit()}>
                        {Locale("Common").ButtonSave}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RadioEditorModal;
