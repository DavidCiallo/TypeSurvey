import { Button, Modal, ModalBody, ModalContent, Input, Select, SelectItem } from "@heroui/react";
import SubmitImg from "../../images/png/Submit.png";
import CollectImg from "../../images/png/Collect.png";
import { useRef, useState } from "react"; // 导入 useState
import { FormFieldImpl } from "../../../shared/impl";

interface Prop {
    isOpen: boolean;
    fields: FormFieldImpl[];
    onOpenChange: (v: boolean) => void;
    onCreate: (data?: { field_index: number; field_value: string }) => void;
}

type SelectionType = "submit" | "collect" | null;

const CreateRecordEditor = ({ isOpen, fields, onOpenChange, onCreate }: Prop) => {
    const [selectedType, setSelectedType] = useState<SelectionType>(null);

    const fieldSelect = useRef<HTMLSelectElement>(null);
    const valueSelect = useRef<HTMLInputElement>(null);
    function handleOpenChange(v: boolean) {
        if (!v) {
            setSelectedType(null);
        }
        onOpenChange(v);
    }

    const SubmitMode = (
        <div className="w-full flex flex-col gap-6">
            <div className="w-full flex flex-row gap-4 items-center">
                <Input size="md" readOnly isDisabled value="无需更多操作" />
            </div>
            <div>
                <Button color="primary" className="w-full" onClick={() => onCreate()}>
                    复制链接
                </Button>
            </div>
        </div>
    );
    const CollectMode = (
        <div className="w-full flex flex-col gap-6">
            <div className="w-full flex flex-row gap-4 items-center">
                <Select ref={fieldSelect} aria-label="select" size="md" placeholder="选择字段">
                    {fields.map((field) => {
                        return (
                            <SelectItem key={field.id} isDisabled={!!field.radios?.length}>
                                {field.field_name}
                            </SelectItem>
                        );
                    })}
                </Select>
                <Input ref={valueSelect} size="md" placeholder="预设值" />
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
                    创建并复制链接
                </Button>
            </div>
        </div>
    );
    return (
        <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
            <ModalContent>
                <ModalBody className="flex flex-col items-center p-6">
                    <div className="mb-4 text-center font-bold text-xl">
                        {selectedType === null ? "请选择表单类型" : ""}
                        {selectedType === "submit" ? "普通表单" : ""}
                        {selectedType === "collect" ? "记名表单" : ""}
                    </div>
                    <div className="flex flex-row gap-5 mb-6">
                        <img
                            src={SubmitImg}
                            alt="从空白创建"
                            className={`w-32 h-32 object-cover cursor-pointer rounded-lg border-4 transition-all ${
                                selectedType === "submit"
                                    ? "border-primary-500 scale-105"
                                    : "border-transparent hover:border-gray-300"
                            }`}
                            onClick={() => setSelectedType("submit")}
                        />
                        <img
                            src={CollectImg}
                            alt="从模板创建"
                            className={`w-32 h-32 object-cover cursor-pointer rounded-lg border-4 transition-all ${
                                selectedType === "collect"
                                    ? "border-primary-500 scale-105"
                                    : "border-transparent hover:border-gray-300"
                            }`}
                            onClick={() => setSelectedType("collect")}
                        />
                    </div>

                    <div className="w-full h-24 max-w-xs flex flex-row">
                        {selectedType === "submit" && SubmitMode}
                        {selectedType === "collect" && CollectMode}
                    </div>
                    <div className="px-10 w-full"></div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default CreateRecordEditor;
