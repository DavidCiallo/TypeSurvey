import { useRef } from "react";
import { Button, Form, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { FormCreateRequest, FormUpdateRequest } from "../../../shared/router/FormRouter";
import { toast } from "../../methods/notify";
import { Locale } from "../../methods/locale";

interface props {
    isOpen: boolean;
    formName: string | null;
    onOpenChange: (v: boolean) => void;
    onSubmit: (data: FormCreateRequest | FormUpdateRequest) => void;
}

const FormEditorModal = ({ isOpen, formName, onOpenChange, onSubmit }: props) => {
    const locale = Locale("FormEditor");
    const formRef = useRef<HTMLFormElement>(null);

    const handleCustomSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
        if (event) {
            event.preventDefault();
        }
        const { form_name } = Object.fromEntries(new FormData(formRef.current!).entries());
        if (!form_name) {
            return toast({
                title: Locale("Common").ToastParamError,
                color: "danger",
            });
        }

        onSubmit({ form_name: form_name.toString() });
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
                        label={locale.FormNameLabel}
                        name="form_name"
                        labelPlacement="outside"
                        defaultValue={formName || ""}
                        placeholder={locale.FormNamePlaceholder}
                        variant="bordered"
                        className="mb-4"
                    />
                </Form>
            </div>
        );
    };
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
                                {Locale("Common").ButtonSave}
                            </Button>
                            <Button color="danger" size="sm" variant="light" onPress={onClose}>
                                {Locale("Common").ButtonCancel}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export default FormEditorModal;
