import { useRef } from "react";
import { Button, Form, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { FormFieldRadioCreateRequest, FormFieldRadioUpdateRequest } from "../../../shared/router/RadioRouter";
import { toast } from "../../methods/notify";
import { Locale } from "../../methods/locale";

interface props {
    field_id: string | null;
    isOpen: boolean;
    onOpenChange: any;
    onSubmit: (data: FormFieldRadioCreateRequest | FormFieldRadioUpdateRequest) => void;
}

const RadioEditorModal = ({ field_id, isOpen, onOpenChange, onSubmit }: props) => {
    const locale = Locale("FormFieldRadioEditor");
    const formRef = useRef<HTMLFormElement>(null);

    const handleCustomSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
        if (event) {
            event.preventDefault();
            return;
        }
        if (!field_id) {
            return;
        }
        const { radio_name } = Object.fromEntries(new FormData(formRef.current!).entries());
        if (!radio_name) {
            return toast({
                title: locale.CreateRadioFailed,
                color: "danger",
            });
        }

        onSubmit({ field_id: field_id, radio_name: radio_name.toString() });
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
                        label={locale.Title}
                        name="radio_name"
                        labelPlacement="outside"
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
                                {Locale("Common").ButtonClose}
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
};

export default RadioEditorModal;
