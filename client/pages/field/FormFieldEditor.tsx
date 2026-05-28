import { useRef } from "react";
import {
    Button,
    Form,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Select,
    SelectItem,
} from "@heroui/react";
import { FormFieldCreateRequest, FormFieldUpdateRequest } from "../../../shared/router/FieldRouter";
import { toast } from "../../methods/notify";
import { FieldType } from "../../../shared/impl/field";
import { FieldTypeList } from "../form/types";
import { Locale } from "../../methods/locale";

interface props {
    form_name: string;
    isOpen: boolean;
    onOpenChange: any;
    onSubmit: (data: FormFieldCreateRequest | FormFieldUpdateRequest) => void;
}

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

    const ModalBodyContent = () => {
        return (
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
                    <Select
                        label={locale.FieldTypeLabel}
                        name="field_type"
                        labelPlacement="outside"
                        placeholder={locale.FieldTypePlaceholder}
                        variant="bordered"
                        className="mb-4"
                    >
                        {FieldTypeList.map(({ name, type }) => (
                            <SelectItem key={type}>{name}</SelectItem>
                        ))}
                    </Select>
                </Form>
            </div>
        );
    };
    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} className="w-full">
            <ModalContent className="md:min-w-[800px] max-h-[80vh]">
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col">{locale.Title}</ModalHeader>
                        <ModalBody className="overflow-y-auto">
                            <ModalBodyContent />
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
