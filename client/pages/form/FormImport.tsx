import {
    Button,
    Checkbox,
    Chip,
    Input,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    Select,
    SelectItem,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from "@heroui/react";
import { Locale } from "../../methods/locale";
import { XlsxHeader } from "../../../shared/router/FileRouter";
import { FieldTypeList } from "./types";
import { FieldType } from "../../../shared/impl/field";

type props = {
    isOpen: boolean;
    header: Array<XlsxHeader>;
    onOpenChange: (v: boolean) => void;
    onSubmit: (
        data: Array<{
            check: boolean;
            field: string;
            type: FieldType;
        }>,
    ) => void;
};

const FormImport = ({ isOpen, header, onOpenChange, onSubmit }: props) => {
    const checks = header.map(() => true);
    const fields = header.map((i) => i.field);
    const types = header.map((i) => i.type);

    const locale = Locale("FormImport");
    const handleCustomSubmit = (event?: React.FormEvent<HTMLFormElement>) => {
        if (event) {
            event.preventDefault();
        }
        const fieldData = checks.map((_, index) => ({
            check: checks[index],
            field: fields[index],
            type: types[index],
        }));
        onSubmit(fieldData);
    };
    const triggerSubmit = () => {
        handleCustomSubmit();
    };
    function ModalBodyContent() {
        const list = (
            <Table aria-label="table">
                <TableHeader>
                    <TableColumn align="center">{locale.UsefulField}</TableColumn>
                    <TableColumn align="center">{locale.FieldName}</TableColumn>
                    <TableColumn align="center">{locale.FieldType}</TableColumn>
                    <TableColumn align="center">{locale.SubList}</TableColumn>
                </TableHeader>
                <TableBody className="h-full">
                    {header.map((i, index) => {
                        const row = (
                            <TableRow key={index}>
                                <TableCell className="min-w-16 min-w-16" align="center">
                                    <Checkbox
                                        aria-label="check"
                                        defaultSelected={true}
                                        onValueChange={(e) => (checks[index] = e)}
                                    />
                                </TableCell>
                                <TableCell className="w-60" align="center">
                                    <Input
                                        variant="bordered"
                                        aria-label="input"
                                        defaultValue={i.field}
                                        onValueChange={(e) => (fields[index] = e)}
                                    />
                                </TableCell>
                                <TableCell className="w-40" align="center">
                                    <Select
                                        variant="bordered"
                                        aria-label="select"
                                        className="w-36 mx-auto"
                                        isRequired
                                        defaultSelectedKeys={[
                                            FieldTypeList.find(({ type }) => type === i.type)?.type || "",
                                        ]}
                                        onSelectionChange={({ currentKey }) =>
                                            (types[index] = (currentKey || "text") as FieldType)
                                        }
                                    >
                                        {FieldTypeList.map(({ name, type }) => (
                                            <SelectItem key={type}>{name}</SelectItem>
                                        ))}
                                    </Select>
                                </TableCell>
                                <TableCell align="center">
                                    {i.sub.map((i) => (
                                        <Chip color="primary" variant="bordered" className="mx-1 h-7 min-w-12">
                                            {i}
                                        </Chip>
                                    ))}
                                </TableCell>
                            </TableRow>
                        );
                        return row;
                    })}
                </TableBody>
            </Table>
        );
        return list;
    }
    return (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} className="w-full">
            <ModalContent className="md:min-w-2/3 max-h-[60vh]">
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col"></ModalHeader>
                        <ModalBody className="overflow-y-auto">
                            <ModalBodyContent />
                        </ModalBody>
                        <ModalFooter>
                            <Button color="primary" size="sm" variant="light" onPress={triggerSubmit}>
                                {locale.SaveEmpty}
                            </Button>
                            <Button color="primary" size="sm" variant="light" onPress={triggerSubmit}>
                                {locale.SaveData}
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

export default FormImport;
