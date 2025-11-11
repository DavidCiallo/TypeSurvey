import { useRef } from "react";
import { Button, Form, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { FormFieldRadioCreateRequest, FormFieldRadioUpdateRequest } from "../../../shared/router/RadioRouter";
import { toast } from "../../methods/notify";

interface props {
    field_id: string;
    isOpen: boolean,
    onOpenChange: any,
    onSubmit: (data: FormFieldRadioCreateRequest | FormFieldRadioUpdateRequest) => void
}

const RadioEditorModal = ({
    field_id,
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
        const { radio_name } = Object.fromEntries(new FormData(formRef.current!).entries());
        if (!radio_name) {
            return toast({ title: "请填写可选项名", color: "danger" })
        }

        onSubmit({ field_id: field_id, radio_name: radio_name.toString() })
    };

    const triggerSubmit = () => {
        handleCustomSubmit();
    };

    const ModalBodyContent = () => {
        return (
            <div className="flex flex-col w-full md:w-3/4 mx-auto">
                <Form ref={formRef} onSubmit={handleCustomSubmit}>
                    <Input
                        isRequired
                        label="新增可选项"
                        name="radio_name"
                        labelPlacement="outside"
                        variant="bordered"
                        className="mb-4"
                    />
                </Form>
            </div>
        )
    }
    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} className="w-full">
            <ModalContent className="md:min-w-[400px] max-h-[60vh]">
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col"></ModalHeader>
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


export default RadioEditorModal;