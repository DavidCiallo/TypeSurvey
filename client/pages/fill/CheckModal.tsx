import { Button, Modal, ModalBody, ModalContent } from "@heroui/react";
import { InputOtp } from "@heroui/input-otp";

interface Prop {
    value: string;
    change: (code: string) => void;
}

const Component = ({ value, change }: Prop) => {
    return (
        <Modal isOpen>
            <ModalContent>
                <ModalBody className="flex flex-col items-center">
                    <div className="mt-3 text-center font-bold">验证码</div>
                    <InputOtp isReadOnly length={4} value={value} onValueChange={change} />
                    <div className="flex flex-row gap-1">
                        {new Array(5).fill("").map((_, i) => (
                            <Button
                                key={i}
                                variant="bordered"
                                isIconOnly
                                onClick={() => change(value + ((i + 1) % 10))}
                            >
                                {(i + 1) % 10}
                            </Button>
                        ))}
                    </div>

                    <div className="flex flex-row mt-[-10px] gap-1">
                        {new Array(5).fill("").map((_, i) => (
                            <Button
                                key={i}
                                variant="bordered"
                                isIconOnly
                                onClick={() => change(value + ((i + 6) % 10))}
                            >
                                {(i + 6) % 10}
                            </Button>
                        ))}
                    </div>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default Component;
