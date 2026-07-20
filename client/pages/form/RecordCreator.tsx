import { Button } from "@/client/components/ui/button";
import {
    Dialog,
    DialogContent,
} from "@/client/components/ui/dialog";
import { Input } from "@/client/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/client/components/ui/select";
import CommonImg from "../../images/png/Common.png";
import CollectImg from "../../images/png/Collect.png";
import { useRef } from "react";
import { FormFieldImpl } from "../../../shared/impl";
import { Locale } from "../../methods/locale";

interface Prop {
    isOpen: boolean;
    fields: FormFieldImpl[];
    selectedType: "common" | "collect" | null;
    setSelectedType: (type: "common" | "collect" | null) => void;
    onOpenChange: (v: boolean) => void;
    onCreate: (data?: { field_index: number; field_value: string }) => void;
}

const CreateRecordEditor = ({ isOpen, fields, selectedType, setSelectedType, onOpenChange, onCreate }: Prop) => {
    const locale = Locale("CreateRecordEditor");

    const fieldValueRef = useRef<{ value: string }>({ value: "" });
    const fieldIndexRef = useRef<number>(0);

    function handleOpenChange(v: boolean) {
        if (!v) {
            setSelectedType(null);
        }
        onOpenChange(v);
    }

    const CommonMode = (
        <div className="flex w-full flex-col gap-6">
            <Input readOnly disabled value={locale.CommonPlaceholder} />
            <Button className="w-full" onClick={() => onCreate()}>
                {locale.CopyLinkButton}
            </Button>
        </div>
    );
    const CollectMode = (
        <div className="flex w-full flex-col gap-6">
            <div className="flex w-full flex-row gap-4 items-center">
                <Select
                    onValueChange={(value) => {
                        const idx = fields.findIndex((f) => f.id === value);
                        fieldIndexRef.current = idx;
                    }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={locale.FieldPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {fields.map((field) => (
                            <SelectItem
                                key={field.id}
                                value={field.id}
                                disabled={!!field.radios?.length}
                            >
                                {field.field_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Input
                    placeholder={locale.ValuePlaceholder}
                    onChange={(e) => (fieldValueRef.current.value = e.target.value)}
                />
            </div>
            <Button
                className="w-full"
                onClick={() =>
                    onCreate({
                        field_index: fieldIndexRef.current,
                        field_value: fieldValueRef.current.value || "",
                    })
                }
            >
                {locale.CreateCopyLinkButton}
            </Button>
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent>
                <div className="flex w-full flex-col items-center p-2">
                    <div className="mb-4 text-center text-xl font-bold">
                        {selectedType === null ? locale.NullSelectedType : ""}
                        {selectedType === "common" ? locale.CommonType : ""}
                        {selectedType === "collect" ? locale.CollectType : ""}
                    </div>
                    <div className="mb-6 flex flex-row gap-5">
                        <img
                            src={CommonImg}
                            alt="common"
                            className={`h-32 w-32 cursor-pointer rounded-lg border-4 object-cover transition-all ${
                                selectedType === "common"
                                    ? "border-primary scale-105"
                                    : "border-transparent hover:border-gray-300"
                            }`}
                            onClick={() => setSelectedType("common")}
                        />
                        <img
                            src={CollectImg}
                            alt="collect"
                            className={`h-32 w-32 cursor-pointer rounded-lg border-4 object-cover transition-all ${
                                selectedType === "collect"
                                    ? "border-primary scale-105"
                                    : "border-transparent hover:border-gray-300"
                            }`}
                            onClick={() => setSelectedType("collect")}
                        />
                    </div>

                    <div className="flex h-24 w-full max-w-xs flex-row">
                        {selectedType === "common" && CommonMode}
                        {selectedType === "collect" && CollectMode}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CreateRecordEditor;
