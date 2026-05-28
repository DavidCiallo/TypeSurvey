import { useRef, useState, useEffect } from "react";
import {
    Button,
    Form,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from "@heroui/react";
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
                className={`w-full h-10 px-3 rounded-xl border-2 text-sm text-left flex items-center justify-between
                    transition-colors duration-150 cursor-pointer
                    ${isOpen
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-default-200 hover:border-default-400 bg-transparent"
                    }
                    ${selectedType ? "text-foreground" : "text-default-400"}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{selectedType ? selectedName : locale.FieldTypePlaceholder}</span>
                <svg
                    className={`text-default-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>
            {isOpen && (
                <div
                    className="absolute left-0 top-full z-50 w-full mt-1 py-1 rounded-xl border-2 border-default-200 bg-content1 shadow-lg overflow-hidden"
                    style={{ animation: "fadeIn 150ms ease-out forwards" } as React.CSSProperties}
                >
                    {FieldTypeList.map(({ name, type }, idx) => (
                        <div
                            key={type}
                            className={`px-3 py-2 text-sm cursor-pointer transition-colors duration-75
                                ${type === selectedType
                                    ? "bg-primary/10 text-primary font-medium"
                                    : focusedIdx === idx
                                        ? "bg-default-100 text-foreground"
                                        : "text-foreground hover:bg-default-100"
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

    const triggerSubmit = () => {
        handleCustomSubmit();
    };

    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} className="w-full">
            <ModalContent className="md:min-w-[800px] max-h-[80vh] overflow-visible">
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col">{locale.Title}</ModalHeader>
                        <ModalBody className="overflow-visible">
                            <div className="flex flex-col w-full md:w-1/2 mx-auto">
                                <Form ref={formRef} onSubmit={handleCustomSubmit}>
                                    <Input
                                        isRequired
                                        label={locale.FormNameLabel}
                                        name="form_name"
                                        labelPlacement="outside"
                                        isReadOnly
                                        value={form_name}
                                        placeholder={locale.FormNamePlaceholder}
                                        variant="bordered"
                                        className="mb-4"
                                    />
                                    <Input
                                        label={locale.FieldNameLabel}
                                        name="field_name"
                                        labelPlacement="outside"
                                        placeholder={locale.FieldNamePlaceholder}
                                        variant="bordered"
                                        className="mb-4"
                                    />
                                    <div className="mb-4 w-full">
                                        <label className="text-sm text-default-600 block pb-1.5">{locale.FieldTypeLabel}</label>
                                        <FieldTypeSelect locale={locale} />
                                    </div>
                                </Form>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="primary" size="sm" variant="light" onPress={triggerSubmit}>
                                {Locale("Common").ButtonSave}
                            </Button>
                            <Button color="danger" size="sm" variant="light" onPress={onClose}>
                                {Locale("Common").ButtonClose}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export default FieldEditorModal;
