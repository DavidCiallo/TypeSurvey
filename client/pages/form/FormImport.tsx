import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
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
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
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
import { FieldRouter } from "../../api/instance";

// Sentinel for "create a new form"; form names are user text, so it cannot
// collide with a real one the way an empty value would.
const newFormValue = "\u0000new-form";

type MatchState = "matched" | "ignored" | "created";

// matchKey folds a column name the way server/xlsx.go matchHeaderKey does, so
// the dialog agrees with the backend about which columns line up.
function matchKey(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[\s\u3000]+/g, "")
        .replace(/（/g, "(")
        .replace(/）/g, ")")
        .replace(/[：]/g, ":")
        .replace(/，/g, ",")
        .replace(/．/g, ".")
        .replace(/－/g, "-")
        .replace(/\([^()]*\)$/, "")
        .replace(/^((?:列|字段|column|col|field)\d*)$/i, "")
        .replace(/[\s_-]+\d+$/, "");
}

type props = {
    isOpen: boolean;
    header: Array<XlsxHeader>;
    formList: string[];
    matchForm: string;
    matchNum: number;
    onOpenChange: (v: boolean) => void;
    onSubmit: (
        data: Array<{
            check: boolean;
            field: string;
            type: FieldType;
        }>,
        usedata: boolean,
        timeFieldIndex?: number,
        targetForm?: string,
        keyFields?: number[],
    ) => void;
};

const FormImport = ({ isOpen, header, formList, matchForm, matchNum, onOpenChange, onSubmit }: props) => {
    const [checks, setChecks] = useState<boolean[]>([]);
    const [fields, setFields] = useState<string[]>([]);
    const [types, setTypes] = useState<FieldType[]>([]);
    const [timeFieldIndex, setTimeFieldIndex] = useState<string>("none");
    const [targetForm, setTargetForm] = useState<string>(newFormValue);
    const [targetFields, setTargetFields] = useState<string[]>([]);
    // Dedup key: the sheet columns whose values identify an existing record.
    // A row whose key matches an existing record is skipped, keeping its data.
    const [keyFields, setKeyFields] = useState<number[]>([]);

    useEffect(() => {
        if (header.length > 0) {
            setChecks(header.map(() => true));
            setFields(header.map((i) => i.field));
            setTypes(header.map((i) => i.type));
            setTimeFieldIndex("none");
            setTargetForm(matchForm || newFormValue);
        }
    }, [header, matchForm]);

    // The chosen form's own field names, used to tell the user which columns
    // carry data and which are dropped. The API pages at 10, so walk them all.
    useEffect(() => {
        if (targetForm === newFormValue) {
            setTargetFields([]);
            return;
        }
        (async () => {
            const names: string[] = [];
            let total = Infinity;
            for (let page = 1; names.length < total; page++) {
                const { success, data } = await FieldRouter.list({ form_name: targetForm, page });
                if (!success || !data || data.list.length === 0) break;
                names.push(...data.list.map((f) => f.field_name));
                total = data.total;
            }
            setTargetFields(names);
        })();
    }, [targetForm]);

    const locale = Locale("FormImport");

    // Which columns carry data into the chosen form; a new form takes them all.
    const targetKeys = new Set(targetFields.map(matchKey));
    const matchStates: MatchState[] = header.map((_, index) => {
        if (targetForm === newFormValue) return "created";
        const key = matchKey(fields[index] ?? "");
        return key && targetKeys.has(key) ? "matched" : "ignored";
    });
    const matchedNum = matchStates.filter((s) => s === "matched").length;

    // Only matched columns can be a dedup key: an unmatched column has no field
    // on the target form, so there is nothing to compare against.
    const keyCandidates = header
        .map((_, index) => index)
        .filter((index) => matchStates[index] === "matched");

    function resetDedup() {
        setKeyFields([]);
    }

    function chooseTargetForm(name: string) {
        setTargetForm(name);
        resetDedup();
    }

    const handleSubmit = (usedata: boolean) => {
        const fieldData = checks.map((_, index) => ({
            check: checks[index],
            field: fields[index],
            type: types[index],
        }));
        const tfi = timeFieldIndex === "none" ? undefined : Number(timeFieldIndex);
        onSubmit(fieldData, usedata, tfi, targetForm === newFormValue ? undefined : targetForm, keyFields);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{locale.FieldName}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-muted-foreground text-sm whitespace-nowrap">{locale.TargetForm}</span>
                    <Select value={targetForm} onValueChange={chooseTargetForm}>
                        <SelectTrigger className="w-56">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={newFormValue}>{locale.NewForm}</SelectItem>
                            {formList.map((name) => (
                                <SelectItem key={name} value={name}>
                                    {name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {targetForm === newFormValue ? (
                        <span className="text-muted-foreground text-xs">{locale.MatchNone}</span>
                    ) : (
                        <span className="text-muted-foreground text-xs">
                            {matchedNum > 0
                                ? locale.MatchFound
                                      .replace("{matched}", String(matchedNum))
                                      .replace("{total}", String(header.length))
                                : locale.MatchNone}
                        </span>
                    )}
                    {matchForm === targetForm && matchNum > 0 && (
                        <Badge variant="secondary">{locale.MatchSuggested}</Badge>
                    )}
                </div>
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
                                            {matchStates[index] === "ignored" ? (
                                                <Badge variant="outline" className="text-muted-foreground">
                                                    {locale.NotImported}
                                                </Badge>
                                            ) : (
                                                i.sub.map((s, idx) => (
                                                    <Badge key={idx} variant="secondary">
                                                        {s}
                                                    </Badge>
                                                ))
                                            )}
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
                {targetForm !== newFormValue && keyCandidates.length > 0 && (
                    <div className="flex flex-col gap-2 border-t pt-3">
                        <div className="flex items-center gap-3">
                            <span className="text-muted-foreground w-16 shrink-0 text-sm whitespace-nowrap">
                                {locale.DedupKey}
                            </span>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    className="border-input focus-visible:ring-ring/50 data-[state=open]:ring-ring/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none data-[state=open]:ring-[3px]"
                                >
                                    <span className="truncate">
                                        {keyFields.length > 0
                                            ? keyFields.map((i) => fields[i] || header[i].field).join(" + ")
                                            : locale.DedupKeyHint}
                                    </span>
                                    <ChevronDown className="text-muted-foreground size-4 shrink-0 opacity-50" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="start"
                                    className="max-h-64 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
                                >
                                    {keyCandidates.map((index) => (
                                        <DropdownMenuCheckboxItem
                                            key={index}
                                            checked={keyFields.includes(index)}
                                            onSelect={(e) => e.preventDefault()}
                                            onCheckedChange={() => {
                                                const next = keyFields.includes(index)
                                                    ? keyFields.filter((i) => i !== index)
                                                    : [...keyFields, index];
                                                setKeyFields(next);
                                            }}
                                        >
                                            {fields[index] || header[index].field}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    {targetForm === newFormValue && (
                        <Button variant="outline" onClick={() => handleSubmit(false)}>
                            {locale.SaveEmpty}
                        </Button>
                    )}
                    <Button onClick={() => handleSubmit(true)} disabled={targetForm !== newFormValue && matchedNum === 0}>
                        {targetForm === newFormValue ? locale.SaveData : locale.SaveIntoForm}
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
