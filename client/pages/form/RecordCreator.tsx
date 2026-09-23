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
import { Link2, UserRound } from "lucide-react";
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
                    <div className="mb-6 flex flex-row gap-4">
                        {(
                            [
                                {
                                    key: "common",
                                    icon: Link2,
                                    title: locale.CommonType,
                                    desc: locale.CommonTypeDesc,
                                },
                                {
                                    key: "collect",
                                    icon: UserRound,
                                    title: locale.CollectType,
                                    desc: locale.CollectTypeDesc,
                                },
                            ] as const
                        ).map(({ key, icon: Icon, title, desc }) => {
                            const active = selectedType === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setSelectedType(key)}
                                    className={`flex h-40 w-44 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 text-center transition-all ${
                                        active
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-border bg-background hover:border-primary/40 hover:bg-accent"
                                    }`}
                                >
                                    <span
                                        className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                                            active
                                                ? "bg-primary/10 text-primary"
                                                : "bg-muted text-muted-foreground"
                                        }`}
                                    >
                                        <Icon className="h-6 w-6" strokeWidth={1.75} />
                                    </span>
                                    <span className="text-sm font-semibold">{title}</span>
                                    <span className="text-xs leading-snug text-muted-foreground">
                                        {desc}
                                    </span>
                                </button>
                            );
                        })}
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
