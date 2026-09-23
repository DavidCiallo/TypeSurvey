import { Button } from "@/client/components/ui/button";
import { Checkbox } from "@/client/components/ui/checkbox";
import { Input } from "@/client/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
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
import { ArrowUp, ArrowDown, ChevronDown, Eye, EyeOff } from "lucide-react";
import { Locale } from "../../methods/locale";
import { FormFieldImpl } from "../../../shared/impl";
import { FieldTypeList } from "../form/types";
import { EmptyComp } from "../../components/empty/Empty";

type props = {
    total: number;
    page: number;
    formFieldList: FormFieldImpl[];
    isRadioEditorOpen: boolean;
    changeFocusField: (field_id: string | null) => void;
    changeRadioEditorOpen: (isOpen: boolean) => void;
    focusFormFieldId: string | null;
    updateField: (field_id: string, key: string, value: number | string | boolean) => void;
    updateRadio: (radio_id: string, key: string, value: number | string | boolean) => void;
};

const Component = ({
    formFieldList,
    changeFocusField,
    changeRadioEditorOpen,
    updateField,
    updateRadio,
}: props) => {
    const locale = Locale("FormFieldPage");

    function changeFieldPosition(field_id: string, direction: boolean) {
        const index = formFieldList.findIndex((i) => i.id == field_id);
        let position = formFieldList[index].position;

        if (!direction) {
            const prevPosition = formFieldList[index - 1]?.position || position - 0.5;
            const prevPrevPosition = formFieldList[index - 2]?.position || prevPosition - 1;
            position = (prevPosition + prevPrevPosition) / 2;
        }
        if (direction) {
            const nextPosition = formFieldList[index + 1]?.position || position + 0.5;
            const nextNextPosition = formFieldList[index + 2]?.position || nextPosition + 1;
            position = (nextPosition + nextNextPosition) / 2;
        }
        return updateField(field_id, "position", position);
    }

    function TypeSelect({ field }: { field: FormFieldImpl }) {
        return (
            <Select
                value={field.field_type || ""}
                disabled={field.disabled}
                onValueChange={(value) => updateField(field.id, "field_type", value)}
            >
                <SelectTrigger className="w-full">
                    <SelectValue placeholder={locale.FieldTypePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                    {FieldTypeList.map(({ name, type }) => (
                        <SelectItem key={type} value={type}>
                            {name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        );
    }

    const OptionTypes = ["checkbox", "checkboxgroup", "select", "mulselect"];
    function RadioSelect({ field }: { field: FormFieldImpl }) {
        const radios = field?.radios || [];
        const selectedCount = radios.filter((r) => r.useful).length;
        const isOptionType = OptionTypes.includes(field.field_type);
        const disabled = field.disabled || !isOptionType;

        return (
            <DropdownMenu>
                <DropdownMenuTrigger
                    disabled={disabled}
                    className="border-input focus-visible:ring-ring/50 data-[state=open]:ring-ring/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 text-sm transition-colors focus-visible:ring-[3px] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:ring-[3px]"
                >
                    <span className="truncate">
                        {selectedCount > 0
                            ? `${locale.TableBodyHadSetRadio} ${selectedCount}`
                            : locale.TableBodyNoSetRadio}
                    </span>
                    <ChevronDown className="text-muted-foreground size-4 shrink-0 opacity-50" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="start"
                    className="max-h-64 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
                >
                    {radios.length === 0 ? (
                        <div className="text-muted-foreground px-2 py-1.5 text-center text-sm">
                            {locale.TableBodyEmptyRadio}
                        </div>
                    ) : (
                        radios.map((radio) => (
                            <DropdownMenuCheckboxItem
                                key={radio.id}
                                checked={!!radio.useful}
                                onSelect={(e) => e.preventDefault()}
                                onCheckedChange={() =>
                                    updateRadio(radio.id, "useful", !radio.useful)
                                }
                            >
                                {radio.radio_name}
                            </DropdownMenuCheckboxItem>
                        ))
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onSelect={() => {
                            changeFocusField(field.id);
                            changeRadioEditorOpen(true);
                        }}
                    >
                        {locale.TableBodyAddRadio}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-center">{locale.TableHeaderFieldNameColumn}</TableHead>
                        <TableHead className="text-center">{locale.TableHeaderFieldTypeColumn}</TableHead>
                        <TableHead className="text-center">{locale.TableHeaderOptionsColumn}</TableHead>
                        <TableHead className="text-center">{locale.TableHeaderRequiredColumn}</TableHead>
                        <TableHead className="text-center">{locale.TableHeaderRemarkColumn}</TableHead>
                        <TableHead className="text-center">{locale.TableHeaderHintColumn}</TableHead>
                        <TableHead className="text-center">{locale.TableHeaderActionsColumn}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {formFieldList.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="py-8">
                                <EmptyComp className="min-h-[20vh]" />
                            </TableCell>
                        </TableRow>
                    ) : (
                        formFieldList.map((field) => {
                            if (!field.radios) field.radios = [];
                            return (
                                <TableRow key={field.id}>
                                    <TableCell className="min-w-48">
                                        <Input
                                            disabled={field.disabled}
                                            defaultValue={field.field_name}
                                            onChange={(e) => updateField(field.id, "field_name", e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell className="min-w-36">
                                        <TypeSelect field={field} />
                                    </TableCell>
                                    <TableCell className="min-w-44">
                                        <RadioSelect field={field} />
                                    </TableCell>
                                    <TableCell className="w-12 text-center">
                                        <Checkbox
                                            disabled={field.disabled}
                                            defaultChecked={field.required}
                                            onCheckedChange={(checked) => updateField(field.id, "required", checked === true)}
                                        />
                                    </TableCell>
                                    <TableCell className="min-w-36">
                                        <Input
                                            disabled={field.disabled}
                                            placeholder={locale.TableBodyNoRemark}
                                            defaultValue={field.comment}
                                            onChange={(e) => updateField(field.id, "comment", e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell className="min-w-36">
                                        <Input
                                            disabled={field.disabled}
                                            placeholder={locale.TableBodyNoHint}
                                            defaultValue={field.placeholder}
                                            onChange={(e) => updateField(field.id, "placeholder", e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell className="min-w-32 max-w-32">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="size-7"
                                                onClick={() => changeFieldPosition(field.id, false)}
                                            >
                                                <ArrowUp className="size-3" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="size-7"
                                                onClick={() => changeFieldPosition(field.id, true)}
                                            >
                                                <ArrowDown className="size-3" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className={`size-7 ${field.disabled ? "text-muted-foreground" : "text-foreground"}`}
                                                onClick={() => updateField(field.id, "disabled", !field.disabled)}
                                            >
                                                {field.disabled ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

export default Component;
