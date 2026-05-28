import { FormFieldImpl } from "../../../shared/impl";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";
import { Locale } from "../../methods/locale";

interface props {
    filed: FormFieldImpl;
    isOpen: boolean;
    onOpenChange: any;
}

const FormFieldContentModal = ({ isOpen, onOpenChange }: props) => {
    const locale = Locale("FormFieldContent");
    const ModalBodyContent = () => {
        return (
            <div className="flex flex-col">
                <div className="flex flex-col md:flex-row md:justify-start md:items-center"></div>
                <div className="mt-3"></div>
            </div>
        );
    };

    const ModalFooterContent = () => {
        return <></>;
    };
    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} className="w-full">
            <ModalContent className="md:min-w-[80vw] max-h-[80vh]">
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col">{locale.FieldDetail}</ModalHeader>
                        <ModalBody className="overflow-y-auto">
                            <ModalBodyContent />
                        </ModalBody>
                        <ModalFooter>
                            <ModalFooterContent />
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

export default FormFieldContentModal;
