import {
    Button,
    Checkbox,
    Input,
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
    isRadioEditorOpen,
    changeFocusField,
    changeRadioEditorOpen,
    focusFormFieldId,
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

    function TypeSelect(item: { field: FormFieldImpl }) {
        const { field } = item;
        return (
            <Select
                isDisabled={field.disabled}
                variant="bordered"
                aria-label="select"
                className="w-36 mx-auto"
                defaultSelectedKeys={[FieldTypeList.find(({ type }) => type === field.field_type)?.type || ""]}
                onSelectionChange={async (key) => {
                    if (!key.currentKey) return;
                    updateField(field.id, "field_type", key.currentKey);
                }}
            >
                {FieldTypeList.map(({ name, type }) => (
                    <SelectItem key={type}>{name}</SelectItem>
                ))}
            </Select>
        );
    }

    function RadioSelect(item: { field: FormFieldImpl }) {
        const { field } = item;
        const radios = field?.radios || [];
        return (
            <Select
                isDisabled={field.disabled}
                hidden={!["checkbox", "select", "mulselect"].some((i) => i == field.field_type)}
                isOpen={!isRadioEditorOpen && field.id === focusFormFieldId}
                onOpenChange={(i) => changeFocusField(i ? field.id : null)}
                className="w-36 mx-auto"
                variant="bordered"
                aria-label="select"
                selectionMode="multiple"
                renderValue={(selectedKeys) => {
                    if (selectedKeys.length === 0) {
                        return null;
                    }
                    return `${locale.TableBodyHadSetRadio} ${selectedKeys.length} `;
                }}
                placeholder={locale.TableBodyNoSetRadio}
                defaultSelectedKeys={radios.filter((radio) => radio.useful).map((radio) => radio.radio_name)}
                listboxProps={{
                    emptyContent: <div className="text-center">{locale.TableBodyEmptyRadio}</div>,
                    bottomContent: <AddRadioComp />,
                }}
            >
                {radios.map(({ id: radio_id, radio_name, useful }) => (
                    <SelectItem key={radio_name} onClick={() => updateRadio(radio_id, "useful", !useful)}>
                        {radio_name}
                    </SelectItem>
                ))}
            </Select>
        );
    }
    function AddRadioComp() {
        return (
            <div className="text-center cursor-pointer" onClick={() => changeRadioEditorOpen(true)}>
                +
            </div>
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
                        <TableCell align="center" className="w-28">
                            <TypeSelect field={field} />
                        </TableCell>
                        <TableCell align="center">
                            <RadioSelect field={field} />
                        </TableCell>
                        <TableCell align="center" className="w-12">
                            <Checkbox
                                isDisabled={field.disabled}
                                defaultSelected={field.required}
                                onValueChange={(required) => updateField(field.id, "required", required)}
                            />
                        </TableCell>
                        <TableCell align="center" className="w-1/5">
                            <Input
                                isDisabled={field.disabled}
                                placeholder={locale.TableBodyNoRemark}
                                variant="bordered"
                                defaultValue={field.comment}
                                onValueChange={(comment) => updateField(field.id, "comment", comment)}
                            />
                        </TableCell>
                        <TableCell align="center" className="w-1/5">
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
        <div className="w-full flex flex-row flex-wrap px-[5vw] py-2 justify-between">
            <Table className="w-full" aria-label="table">
                {TableHeaders}
                {TableBodyContent}
            </Table>
        </div>
    );
};

export default Component;
