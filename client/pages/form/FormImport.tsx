import { Button } from "@/client/components/ui/button";
import { Checkbox } from "@/client/components/ui/checkbox";
import { Badge } from "@/client/components/ui/badge";
import { Input } from "@/client/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/client/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/client/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/client/components/ui/table";
import { Locale } from "../../methods/locale";
import { XlsxHeader } from "../../../shared/modules/file/file.interface";
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

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{locale.FieldName}</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-center">{locale.UsefulField}</TableHead>
                                <TableHead className="text-center">{locale.FieldName}</TableHead>
                                <TableHead className="text-center">{locale.FieldType}</TableHead>
                                <TableHead className="text-center">{locale.SubList}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {header.map((i, index) => (
                                <TableRow key={index}>
                                    <TableCell className="text-center">
                                        <Checkbox
                                            defaultChecked={true}
                                            onCheckedChange={(e) => (checks[index] = e === true)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            defaultValue={i.field}
                                            onChange={(e) => (fields[index] = e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            defaultValue={i.type}
                                            onValueChange={(value) => (types[index] = value as FieldType)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {FieldTypeList.map(({ name, type }) => (
                                                    <SelectItem key={type} value={type}>
                                                        {name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-wrap justify-center gap-1">
                                            {i.sub.map((s, idx) => (
                                                <Badge key={idx} variant="secondary">
                                                    {s}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={triggerSubmit}>
                        {locale.SaveEmpty}
                    </Button>
                    <Button onClick={triggerSubmit}>
                        {locale.SaveData}
                    </Button>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        {Locale("Common").ButtonCancel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default FormImport;
