import { useRef } from "react";
import { Button } from "@/client/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { FormCreateRequest, FormUpdateRequest } from "../../../shared/modules/form/form.interface";
import { toast } from "../../methods/notify";
import { Locale } from "../../methods/locale";

interface props {
    isOpen: boolean;
    formName: string | null;
    onOpenChange: (v: boolean) => void;
    onSubmit: (data: FormCreateRequest | FormUpdateRequest) => void;
}

const FormEditorModal = ({ isOpen, formName, onOpenChange, onSubmit }: props) => {
    const locale = Locale("FormEditor");
    const formRef = useRef<HTMLFormElement>(null);

    const handleCustomSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
        if (event) {
            event.preventDefault();
        }
        const { form_name } = Object.fromEntries(new FormData(formRef.current!).entries());
        if (!form_name) {
            return toast({
                title: Locale("Common").ToastParamError,
                color: "danger",
            });
        }

        onSubmit({ form_name: form_name.toString() });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{locale.FormNameLabel}</DialogTitle>
                </DialogHeader>
                <form ref={formRef} onSubmit={handleCustomSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="form_name">{locale.FormNameLabel}</Label>
                        <Input
                            id="form_name"
                            name="form_name"
                            defaultValue={formName || ""}
                            placeholder={locale.FormNamePlaceholder}
                        />
                    </div>
                </form>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        {Locale("Common").ButtonCancel}
                    </Button>
                    <Button type="button" onClick={() => handleCustomSubmit()}>
                        {Locale("Common").ButtonSave}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default FormEditorModal;
