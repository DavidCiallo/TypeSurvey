import { Button, Modal, ModalBody, ModalContent, Input, Select, SelectItem } from "@heroui/react";
import CommonImg from "../../images/png/Common.png";
import CollectImg from "../../images/png/Collect.png";
import { useRef, useState } from "react";
import { FormFieldImpl } from "../../../shared/impl";
import { Locale } from "../../methods/locale";

interface Prop {
    isOpen: boolean;
    fields: FormFieldImpl[];
    onOpenChange: (v: boolean) => void;
    onCreate: (data?: { field_index: number; field_value: string }) => void;
}

type SelectionType = "common" | "collect" | null;

const CreateRecordEditor = ({ isOpen, fields, onOpenChange, onCreate }: Prop) => {
    const locale = Locale("CreateRecordEditor");
    const [selectedType, setSelectedType] = useState<SelectionType>(null);

    const fieldSelect = useRef<HTMLSelectElement>(null);
    const valueSelect = useRef<HTMLInputElement>(null);
    function handleOpenChange(v: boolean) {
        if (!v) {
            setSelectedType(null);
        }
        onOpenChange(v);
    }

    const CommonMode = (
        <div className="w-full flex flex-col gap-6">
            <div className="w-full flex flex-row gap-4 items-center">
                <Input size="md" readOnly isDisabled value={locale.CommonPlaceholder} />
            </div>
            <div>
                <Button color="primary" className="w-full" onClick={() => onCreate()}>
                    {locale.CopyLinkButton}
                </Button>
            </div>
        </div>
    );
    const CollectMode = (
        <div className="w-full flex flex-col gap-6">
            <div className="w-full flex flex-row gap-4 items-center">
                <Select ref={fieldSelect} aria-label="select" size="md" placeholder={locale.FieldPlaceholder}>
                    {fields.map((field) => {
                        return (
                            <SelectItem key={field.id} isDisabled={!!field.radios?.length}>
                                {field.field_name}
                            </SelectItem>
                        );
                    })}
                </Select>
                <Input ref={valueSelect} size="md" placeholder={locale.ValuePlaceholder} />
            </div>
            <div>
                <Button
                    color="primary"
                    className="w-full"
                    onClick={() =>
                        onCreate({
                            field_index: (fieldSelect.current?.selectedIndex || 0) - 1,
                            field_value: valueSelect.current?.value || "",
                        })
                    }
                >
                    {locale.CreateCopyLinkButton}
                </Button>
            </div>
        </div>
    );
    return (
        <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
            <ModalContent>
                <ModalBody className="flex flex-col items-center p-6">
                    <div className="mb-4 text-center font-bold text-xl">
                        {selectedType === null ? locale.NullSelectedType : ""}
                        {selectedType === "common" ? locale.CommonType : ""}
                        {selectedType === "collect" ? locale.CollectType : ""}
                    </div>
                    <div className="flex flex-row gap-5 mb-6">
                        <img
                            src={CommonImg}
                            alt="common"
                            className={`w-32 h-32 object-cover cursor-pointer rounded-lg border-4 transition-all ${
                                selectedType === "common"
                                    ? "border-primary-500 scale-105"
                                    : "border-transparent hover:border-gray-300"
                            }`}
                            onClick={() => setSelectedType("common")}
                        />
                        <img
                            src={CollectImg}
                            alt="collect"
                            className={`w-32 h-32 object-cover cursor-pointer rounded-lg border-4 transition-all ${
                                selectedType === "collect"
                                    ? "border-primary-500 scale-105"
                                    : "border-transparent hover:border-gray-300"
                            }`}
                            onClick={() => setSelectedType("collect")}
                        />
                    </div>

                    <div className="w-full h-24 max-w-xs flex flex-row">
                        {selectedType === "common" && CommonMode}
                        {selectedType === "collect" && CollectMode}
                    </div>
                    <div className="px-10 w-full"></div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default CreateRecordEditor;
