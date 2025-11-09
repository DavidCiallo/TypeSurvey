import { useRef } from "react";
import { Button, Form, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader} from "@heroui/react";
import { FormCreateRequest, FormUpdateRequest } from "../../../shared/router/FormRouter";
import { toast } from "../../methods/notify";

interface props {
    isOpen: boolean,
    onOpenChange: any,
    onSubmit: (data: FormCreateRequest | FormUpdateRequest) => void
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
        const { form_name } = Object.fromEntries(new FormData(formRef.current!).entries());
        if (!form_name) {
            return toast({ title: "请填写表单名", color: "danger" })
        }

        onSubmit({ form_name: form_name.toString() })
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
                        label="表单名"
                        name="form_name"
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


export default FieldEditorModal;