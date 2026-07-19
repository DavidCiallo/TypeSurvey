import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/client/components/ui/button";
import { Checkbox } from "@/client/components/ui/checkbox";
import { Input } from "@/client/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/client/components/ui/table";
import { ArrowUp, ArrowDown, Eye, EyeOff, Check } from "lucide-react";
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

    function DropdownPopover({ children, trigger, disabled }: { children: React.ReactNode; trigger: React.ReactNode; disabled?: boolean }) {
        const [isOpen, setIsOpen] = useState(false);
        const [isClosing, setIsClosing] = useState(false);
        const [pos, setPos] = useState({ left: 0, top: 0, width: 0 });
        const triggerRef = useRef<HTMLDivElement>(null);
        const popoverRef = useRef<HTMLDivElement>(null);

        const close = () => {
            setIsClosing(true);
            setTimeout(() => {
                setIsClosing(false);
                setIsOpen(false);
            }, 100);
        };

        const toggle = () => {
            if (disabled) return;
            if (isOpen) {
                close();
            } else {
                if (triggerRef.current) {
                    const rect = triggerRef.current.getBoundingClientRect();
                    setPos({ left: rect.left, top: rect.bottom + 4, width: rect.width });
                }
                setIsOpen(true);
            }
        };

        useEffect(() => {
            if (!isOpen) return;
            const handleClick = (e: MouseEvent) => {
                const target = e.target as Node;
                if (
                    popoverRef.current && !popoverRef.current.contains(target) &&
                    triggerRef.current && !triggerRef.current.contains(target)
                ) {
                    close();
                }
            };
            document.addEventListener("click", handleClick, true);
            return () => document.removeEventListener("click", handleClick, true);
        }, [isOpen]);

        const visible = isOpen || isClosing;

        return (
            <>
                <div ref={triggerRef} onClick={toggle} className="cursor-pointer">
                    {trigger}
                </div>
                {visible && createPortal(
                    <div
                        ref={popoverRef}
                        className="bg-popover fixed z-[9999] rounded-md border p-1 shadow-md"
                        style={{
                            left: pos.left,
                            top: pos.top,
                            width: pos.width,
                            opacity: isClosing ? 0 : 1,
                            transition: "opacity 100ms ease-in-out",
                        }}
                    >
                        {children}
                    </div>,
                    document.body
                )}
            </>
        );
    }

    function TypeSelect({ field }: { field: FormFieldImpl }) {
        const current = FieldTypeList.find(({ type }) => type === field.field_type);

        return (
            <DropdownPopover trigger={
                <div className={`border-input flex h-9 w-full items-center rounded-md border px-3 text-sm transition-colors
                    ${field.disabled ? "opacity-50" : "hover:border-input bg-transparent"}`}>
                    <span className="flex-1 truncate">{current?.name || ""}</span>
                    <svg className="text-muted-foreground ml-1 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </div>
            }>
                {FieldTypeList.map(({ name, type }) => (
                    <div
                        key={type}
                        className={`cursor-pointer rounded-sm px-2 py-1.5 text-sm transition-colors
                            ${type === field.field_type ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-accent"}`}
                        onClick={() => updateField(field.id, "field_type", type)}
                    >
                        {name}
                    </div>
                ))}
            </DropdownPopover>
        );
    }

    const OptionTypes = ["checkbox", "checkboxgroup", "select", "mulselect"];
    function RadioSelect({ field }: { field: FormFieldImpl }) {
        const radios = field?.radios || [];
        const selectedCount = radios.filter((r) => r.useful).length;
        const isOptionType = OptionTypes.includes(field.field_type);
        const disabled = field.disabled || !isOptionType;

        return (
            <DropdownPopover disabled={disabled} trigger={
                <div className={`border-input flex h-9 w-full items-center rounded-md border px-3 text-sm transition-colors
                    ${disabled ? "cursor-not-allowed opacity-50" : "hover:border-input bg-transparent"}`}>
                    <span className="flex-1 truncate">
                        {selectedCount > 0 ? `${locale.TableBodyHadSetRadio} ${selectedCount}` : locale.TableBodyNoSetRadio}
                    </span>
                    <svg className="text-muted-foreground ml-1 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </div>
            }>
                <div className="max-h-48 overflow-y-auto">
                    {radios.length === 0
                        ? <div className="text-muted-foreground px-2 py-1.5 text-center text-sm">{locale.TableBodyEmptyRadio}</div>
                        : radios.map((radio) => (
                            <div
                                key={radio.radio_name}
                                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    updateRadio(radio.id, "useful", !radio.useful);
                                }}
                            >
                                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors
                                    ${radio.useful ? "bg-primary border-primary" : "border-input"}`}>
                                    {radio.useful && <Check className="size-3 text-primary-foreground" />}
                                </span>
                                <span className="truncate">{radio.radio_name}</span>
                            </div>
                        ))
                    }
                </div>
                <div
                    className="text-primary cursor-pointer rounded-sm border-t px-2 py-1.5 text-center text-sm hover:bg-accent"
                    onClick={() => {
                        changeFocusField(field.id);
                        changeRadioEditorOpen(true);
                    }}
                >
                    {locale.TableBodyAddRadio}
                </div>
            </DropdownPopover>
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
                                <EmptyComp height="min-h-[20vh]" />
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
