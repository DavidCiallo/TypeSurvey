import { useRef, useState } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/client/components/ui/select";
import { FieldCreateRequest, FieldUpdateRequest } from "../../../shared/modules/field/field.interface";
import { toast } from "../../methods/notify";
import { FieldType } from "../../../shared/impl/field";
import { FieldTypeList } from "../form/types";
import { Locale } from "../../methods/locale";

interface props {
    form_name: string;
    isOpen: boolean;
    onOpenChange: any;
    onSubmit: (data: FieldCreateRequest | FieldUpdateRequest) => void;
}

const FieldTypeSelect = ({ locale }: { locale: any }) => {
    const [selectedType, setSelectedType] = useState("");

    return (
        <>
            <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder={locale.FieldTypePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                    {FieldTypeList.map(({ name, type }) => (
                        <SelectItem key={type} value={type}>
                            {name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <input type="hidden" name="field_type" value={selectedType} />
        </>
    );
};

const FieldEditorModal = ({ form_name, isOpen, onOpenChange, onSubmit }: props) => {
    const locale = Locale("FormFieldEditor");
    const formRef = useRef<HTMLFormElement>(null);

    const handleCustomSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
        if (event) {
            event.preventDefault();
        }
        const { form_name, field_name, field_type } = Object.fromEntries(new FormData(formRef.current!).entries());
        if (!form_name || !field_name || !field_type) {
            return toast({ title: Locale("Common").ToastParamError, color: "danger" });
        }
        onSubmit({
            form_name: form_name.toString(),
            field_name: field_name.toString(),
            field_type: field_type.toString() as FieldType,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{locale.Title}</DialogTitle>
                </DialogHeader>
                <form ref={formRef} onSubmit={handleCustomSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label>{locale.FormNameLabel}</Label>
                        <Input
                            name="form_name"
                            readOnly
                            value={form_name}
                            placeholder={locale.FormNamePlaceholder}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>{locale.FieldNameLabel}</Label>
                        <Input
                            name="field_name"
                            placeholder={locale.FieldNamePlaceholder}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>{locale.FieldTypeLabel}</Label>
                        <FieldTypeSelect locale={locale} />
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

export default FieldEditorModal;
