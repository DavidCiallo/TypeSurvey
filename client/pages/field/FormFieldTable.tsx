import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    Button,
    Checkbox,
    Input,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from "@heroui/react";
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
                        className="fixed z-[9999] py-1 rounded-xl border-2 border-default-200 bg-content1 shadow-lg"
                        style={{
                            left: pos.left,
                            top: pos.top,
                            width: pos.width,
                            animation: isClosing ? "fadeOut 100ms ease-in forwards" : "fadeIn 150ms ease-out forwards",
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
                <div className={`w-full h-10 px-3 rounded-xl border-2 text-sm text-left flex items-center
                    transition-colors duration-150
                    ${field.disabled ? "opacity-50" : "border-default-200 hover:border-default-400 bg-transparent"}`}>
                    <span className="flex-1 truncate">{current?.name || ""}</span>
                    <svg className="text-default-400 flex-shrink-0 ml-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </div>
            }>
                {FieldTypeList.map(({ name, type }) => (
                    <div
                        key={type}
                        className={`px-3 py-2 text-sm cursor-pointer transition-colors duration-75 whitespace-nowrap
                            ${type === field.field_type ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-default-100"}`}
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
                <div className={`w-full h-10 px-3 rounded-xl border-2 text-sm text-left flex items-center
                    transition-colors duration-150
                    ${disabled ? "opacity-50 cursor-not-allowed" : "border-default-200 hover:border-default-400 bg-transparent"}`}>
                    <span className="flex-1 truncate">
                        {selectedCount > 0 ? `${locale.TableBodyHadSetRadio} ${selectedCount}` : locale.TableBodyNoSetRadio}
                    </span>
                    <svg className="text-default-400 flex-shrink-0 ml-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </div>
            }>
                <div className="max-h-48 overflow-y-auto">
                    {radios.length === 0
                        ? <div className="px-3 py-2 text-sm text-default-400 text-center">{locale.TableBodyEmptyRadio}</div>
                        : radios.map((radio) => (
                            <div
                                key={radio.radio_name}
                                className="px-3 py-2 text-sm cursor-pointer transition-colors duration-75 flex items-center gap-2 hover:bg-default-100"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    updateRadio(radio.id, "useful", !radio.useful);
                                }}
                            >
                                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                                    ${radio.useful ? "bg-primary border-primary" : "border-default-300"}`}>
                                    {radio.useful && (
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>
                                    )}
                                </span>
                                <span className="truncate">{radio.radio_name}</span>
                            </div>
                        ))
                    }
                </div>
                <div
                    className="px-3 py-2 text-sm text-primary cursor-pointer hover:bg-default-100 border-t border-default-200 text-center"
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
    const TableHeaders = (
        <TableHeader>
            <TableColumn align="center">{locale.TableHeaderFieldNameColumn}</TableColumn>
            <TableColumn align="center">{locale.TableHeaderFieldTypeColumn}</TableColumn>
            <TableColumn align="center">{locale.TableHeaderOptionsColumn}</TableColumn>
            <TableColumn align="center">{locale.TableHeaderRequiredColumn}</TableColumn>
            <TableColumn align="center">{locale.TableHeaderRemarkColumn}</TableColumn>
            <TableColumn align="center">{locale.TableHeaderHintColumn}</TableColumn>
            <TableColumn align="center">{locale.TableHeaderActionsColumn}</TableColumn>
        </TableHeader>
    );
    const TableBodyContent = (
        <TableBody emptyContent={<EmptyComp height="min-h-[30vh]" />}>
            {formFieldList.map((field) => {
                if (!field.radios) field.radios = [];
                return (
                    <TableRow key={field.id}>
                        <TableCell className="min-w-48" align="center">
                            <Input
                                variant="bordered"
                                isDisabled={field.disabled}
                                defaultValue={field.field_name}
                                onValueChange={(field_name) => updateField(field.id, "field_name", field_name)}
                            />
                        </TableCell>
                        <TableCell align="center" className="min-w-36">
                            <TypeSelect field={field} />
                        </TableCell>
                        <TableCell align="center" className="min-w-44">
                            <RadioSelect field={field} />
                        </TableCell>
                        <TableCell align="center" className="w-12">
                            <Checkbox
                                isDisabled={field.disabled}
                                defaultSelected={field.required}
                                onValueChange={(required) => updateField(field.id, "required", required)}
                            />
                        </TableCell>
                        <TableCell align="center" className="min-w-36">
                            <Input
                                isDisabled={field.disabled}
                                placeholder={locale.TableBodyNoRemark}
                                variant="bordered"
                                defaultValue={field.comment}
                                onValueChange={(comment) => updateField(field.id, "comment", comment)}
                            />
                        </TableCell>
                        <TableCell align="center" className="min-w-36">
                            <Input
                                isDisabled={field.disabled}
                                placeholder={locale.TableBodyNoHint}
                                variant="bordered"
                                defaultValue={field.placeholder}
                                onValueChange={(ph) => updateField(field.id, "placeholder", ph)}
                            />
                        </TableCell>
                        <TableCell className="min-w-32 max-w-32">
                            <Button
                                className="mr-1"
                                isIconOnly
                                variant="bordered"
                                color="primary"
                                size="sm"
                                onClick={() => changeFieldPosition(field.id, false)}
                            >
                                {"↑"}
                            </Button>
                            <Button
                                className="mr-1"
                                isIconOnly
                                variant="bordered"
                                color="primary"
                                size="sm"
                                onClick={() => changeFieldPosition(field.id, true)}
                            >
                                {"↓"}
                            </Button>
                            <Button
                                isIconOnly
                                variant="bordered"
                                color={field.disabled ? "success" : "danger"}
                                size="sm"
                                onClick={() => updateField(field.id, "disabled", !field.disabled)}
                            >
                                {field.disabled ? "O" : "X"}
                            </Button>
                        </TableCell>
                    </TableRow>
                );
            })}
        </TableBody>
    );
    return (
        <div className="w-full px-[5vw] py-2 overflow-x-auto">
            <Table className="min-w-[900px]" aria-label="table">
                {TableHeaders}
                {TableBodyContent}
            </Table>
        </div>
    );
};

export default Component;
