import { useEffect, useState } from "react";
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
        usedata: boolean,
        timeFieldIndex?: number,
    ) => void;
};

const FormImport = ({ isOpen, header, onOpenChange, onSubmit }: props) => {
    const [checks, setChecks] = useState<boolean[]>([]);
    const [fields, setFields] = useState<string[]>([]);
    const [types, setTypes] = useState<FieldType[]>([]);
    const [timeFieldIndex, setTimeFieldIndex] = useState<string>("none");

    useEffect(() => {
        if (header.length > 0) {
            setChecks(header.map(() => true));
            setFields(header.map((i) => i.field));
            setTypes(header.map((i) => i.type));
            setTimeFieldIndex("none");
        }
    }, [header]);

    const locale = Locale("FormImport");

    const handleSubmit = (usedata: boolean) => {
        const fieldData = checks.map((_, index) => ({
            check: checks[index],
            field: fields[index],
            type: types[index],
        }));
        const tfi = timeFieldIndex === "none" ? undefined : Number(timeFieldIndex);
        onSubmit(fieldData, usedata, tfi);
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
                                            checked={checks[index] ?? true}
                                            onCheckedChange={(e) => {
                                                const next = [...checks];
                                                next[index] = e === true;
                                                setChecks(next);
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            value={fields[index] ?? ""}
                                            onChange={(e) => {
                                                const next = [...fields];
                                                next[index] = e.target.value;
                                                setFields(next);
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={types[index] ?? "text"}
                                            onValueChange={(value) => {
                                                const next = [...types];
                                                next[index] = value as FieldType;
                                                setTypes(next);
                                            }}
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
                <div className="flex items-center gap-3 pt-2">
                    <span className="text-muted-foreground text-sm whitespace-nowrap">时间字段</span>
                    <Select value={timeFieldIndex} onValueChange={setTimeFieldIndex}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="不使用" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">不使用</SelectItem>
                            {header.map((h, idx) => (
                                <SelectItem key={idx} value={String(idx)}>
                                    {fields[idx] || h.field}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span className="text-muted-foreground/60 text-xs">选择一列作为记录的创建/更新时间</span>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleSubmit(false)}>
                        {locale.SaveEmpty}
                    </Button>
                    <Button onClick={() => handleSubmit(true)}>
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
