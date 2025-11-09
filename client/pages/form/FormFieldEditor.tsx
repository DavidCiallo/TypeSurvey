import { useRef } from "react";
import { Button, Form, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem } from "@heroui/react";
import { FormFieldCreateRequest, FormFieldUpdateRequest } from "../../../shared/router/FieldRouter";
import { toast } from "../../methods/notify";
import { FieldType } from "../../../shared/impl/field";

interface props {
    isOpen: boolean,
    onOpenChange: any,
    onSubmit: (data: FormFieldCreateRequest | FormFieldUpdateRequest) => void
}

const FieldEditorModal = ({
    isOpen,
    onOpenChange,
    onSubmit
}: props) => {
    const formRef = useRef<HTMLFormElement>(null);

    const handleCustomSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
        if (event) {
            event.preventDefault();
            return;
        }
        const { form_name, field_name, field_type } = Object.fromEntries(new FormData(formRef.current!).entries());
        if (!form_name || !field_name || !field_type) {
            return toast({ title: "格式错误", color: "danger" })
        }

        onSubmit({
            form_name: form_name.toString(),
            field_name: field_name.toString(),
            field_type: field_type.toString() as FieldType
        })
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
                        label="表单名"
                        name="form_name"
                        labelPlacement="outside"
                        placeholder="请选择表单"
                        variant="bordered"
                        className="mb-4"
                    />
                    <Input
                        label="字段名"
                        name="field_name"
                        labelPlacement="outside"
                        placeholder=""
                        variant="bordered"
                        className="mb-4"
                    />
                    <Select
                        label="字段类型"
                        name="field_type"
                        labelPlacement="outside"
                        variant="bordered"
                        className="mb-4"
                    >
                        {
                            ["文本"].map(item => (
                                <SelectItem key={item} textValue={item}>{item}</SelectItem>
                            ))
                        }
                    </Select>
                </Form>
            </div>
        )
    }
    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} className="w-full">
            <ModalContent className="md:min-w-[800px] max-h-[80vh]">
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col">编辑字段</ModalHeader>
                        <ModalBody className="overflow-y-auto">
                            <ModalBodyContent />
                        </ModalBody>
                        <ModalFooter>
                            <Button color="primary" size="sm" variant="light" onPress={triggerSubmit}>
                                保存
                            </Button>
                            <Button color="danger" size="sm" variant="light" onPress={onClose}>
                                关闭
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    )
};


export default FieldEditorModal;