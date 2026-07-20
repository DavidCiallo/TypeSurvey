import { useRef, useState, useEffect } from "react";
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
    const [isOpen, setIsOpen] = useState(false);
    const [selectedType, setSelectedType] = useState("");
    const [selectedName, setSelectedName] = useState("");
    const [focusedIdx, setFocusedIdx] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) setFocusedIdx(-1);
        else {
            const idx = selectedType
                ? FieldTypeList.findIndex((item) => item.type === selectedType)
                : -1;
            setFocusedIdx(idx >= 0 ? idx : 0);
        }
    }, [isOpen, selectedType]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setFocusedIdx((prev) => (prev + 1) % FieldTypeList.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setFocusedIdx((prev) => (prev - 1 + FieldTypeList.length) % FieldTypeList.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (focusedIdx >= 0) {
                selectItem(FieldTypeList[focusedIdx]);
            }
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    const selectItem = (item: { name: string; type: string }) => {
        setSelectedType(item.type);
        setSelectedName(item.name);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full" ref={containerRef} onKeyDown={handleKeyDown}>
            <button
                type="button"
                className={`border-input bg-background flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm transition-colors ${
                    isOpen ? "ring-ring ring-2" : "hover:border-input"
                } ${selectedType ? "text-foreground" : "text-muted-foreground"}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{selectedType ? selectedName : locale.FieldTypePlaceholder}</span>
                <svg
                    className={`text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>
            {isOpen && (
                <div className="bg-popover absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-md border p-1 shadow-md">
                    {FieldTypeList.map(({ name, type }, idx) => (
                        <div
                            key={type}
                            className={`cursor-pointer rounded-sm px-2 py-1.5 text-sm transition-colors ${
                                type === selectedType
                                    ? "bg-primary/10 text-primary font-medium"
                                    : focusedIdx === idx
                                        ? "bg-accent text-accent-foreground"
                                        : "text-foreground hover:bg-accent"
                            }`}
                            onClick={() => selectItem({ name, type })}
                            onMouseEnter={() => setFocusedIdx(idx)}
                        >
                            {name}
                        </div>
                    ))}
                </div>
            )}
            <input type="hidden" name="field_type" value={selectedType} />
        </div>
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
