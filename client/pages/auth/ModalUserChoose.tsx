import { Button, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react";

interface props {
    code: string | null
    setCode: any,
    isOpen: boolean,
    onOpenChange: any,
    submit: any
}

const AuthCodeModal = ({
    code,
    setCode,
    isOpen,
    onOpenChange,
    submit
}: props) => {
    const users = [
        { name: "孟凡贺", code: "mengfanhe" },
        { name: "kk", code: "kk" },
        { name: "明明", code: "mingming" },
        { name: "小夏", code: "xiaoxia" },
        { name: "小柠", code: "xiaoling" },
        { name: "冰冰", code: "bingbing" },
        { name: "小侯", code: "xiaohou" },
        { name: "非晚", code: "feinan" },
        { name: "唐唐", code: "tangtang" },
        { name: "柏翊", code: "baiyi" },
        { name: "十一", code: "shiyi" }
    ]
    const ModalBodyContent = () => {
        return (
            <div className="flex flex-col">
                <div className="flex flex-row flex-wrap mx-auto">
                    {users.map((user) => (
                        <Chip
                            key={user.code}
                            size="lg"
                            className="mx-4 my-2 cursor-pointer"
                            color={code === user.code ? "primary" : "default"}
                            variant="bordered"
                            onClick={() => setCode(user.code)}
                        >
                            {user.name}
                        </Chip>
                    ))}
                </div>
            </div>
        )
    }
    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} className="w-full">
            <ModalContent className="md:w-[500px] max-h-[80vh]">
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col">请选择您的身份</ModalHeader>
                        <ModalBody className="overflow-y-auto">
                            <ModalBodyContent />
                        </ModalBody>
                        <ModalFooter>
                            <Button
                                color="success" size="sm" variant="solid"
                                onPress={() => submit(code, users.find(i => i.code === code)!.name)}
                            >
                                <span className="text-white font-bold">确定这是我本人并保存</span>
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    )
};


export default AuthCodeModal;