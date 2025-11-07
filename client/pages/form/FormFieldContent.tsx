import { FormFieldImpl } from "../../../shared/impl";
import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";

interface props {
    filed: FormFieldImpl,
    isOpen: boolean,
    onOpenChange: any,
}

const FormFieldContentModal = ({
    isOpen,
    onOpenChange,
}: props) => {
    const ModalBodyContent = () => {
        return (
            <div className="flex flex-col">
                <div className="flex flex-col md:flex-row md:justify-start md:items-center">
           
                </div>
                <div className="mt-3">
                   
                </div>
            </div>
        )
    }

    const ModalFooterContent = () => {
        return (<>
           
        </>)
    }
    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} className="w-full">
            <ModalContent className="md:min-w-[80vw] max-h-[80vh]">
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col">字段详情</ModalHeader>
                        <ModalBody className="overflow-y-auto">
                            <ModalBodyContent />
                        </ModalBody>
                        <ModalFooter>
                            <ModalFooterContent />
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


export default FormFieldContentModal;