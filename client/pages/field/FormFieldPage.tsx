import { Header } from "../../components/header/Header";
import { useEffect, useState } from "react";
import {
    Button,
    Input,
    Pagination,
    Select,
    SelectItem,
    Spinner,
    Table,
    TableBody,
    TableCell,
    TableColumn,
    TableHeader,
    TableRow,
} from "@heroui/react";
import { FormFieldImpl } from "../../../shared/impl";
import { FormFieldCreateResponse, FormFieldListResponse } from "../../../shared/router/FieldRouter";
import { FormRouter, FormFieldRouter, FormFieldRadioRouter } from "../../api/instance";
import FormEditor from "../form/FormEditor";
import FieldEditor from "./FormFieldEditor";
import RadioEditor from "./FormFieldRadioEditor";
import { toast } from "../../methods/notify";
import { FormListResponse } from "../../../shared/router/FormRouter";
import { FieldTypeList } from "../form/types";
import { FieldType } from "../../../shared/impl/field";
import { FormFieldRadioCreateResponse } from "../../../shared/router/RadioRouter";
import { Locale } from "../../methods/locale";

const Component = () => {
    const locale = Locale("FormFieldPage");

    const [formName, setFormName] = useState<string>("");
    const [formList, setFormList] = useState<string[]>([]);
    const [formFieldList, setFormFieldList] = useState<FormFieldImpl[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const [focusFormField, setFocusFormField] = useState<FormFieldImpl | null>(null);
    const [isFormEditorOpen, setFormEditorOpen] = useState(false);
    const [isFieldEditorOpen, setFieldEditorOpen] = useState(false);
    const [isRadioEditorOpen, setRadioEditorOpen] = useState(false);

    async function chooseForm(name: string | null) {
        if (!name || !formList.includes(name)) return;
        if (formName !== name) {
            setFormName(name);
            setIsLoading(true);
            setPage(1);
            const { success, data, message } = await FormFieldRouter.list({ form_name: name, page: 1 });
            if (!success || !data) {
                setIsLoading(false);
                return toast({ title: message, color: "danger" });
            }
            const { list, total } = data;
            renderFormField(list, total);
        } else {
            const { success, data, message } = await FormFieldRouter.list({ form_name: name, page: page });
            if (!success || !data) {
                setIsLoading(false);
                return toast({ title: message, color: "danger" });
            }
            const { list, total } = data;
            renderFormField(list, total);
        }
    }

    function openFormEditor(formname?: string) {
        setFormEditorOpen(true);
    }

    function openRadioEditor(field_id?: string) {
        setRadioEditorOpen(true);
    }

    function renderFormField(list: FormFieldImpl[], total: number) {
        setTotal(total);
        setFormFieldList(list);
        setIsLoading(false);
    }

    useEffect(() => {
        (async () => {
            const { success, data, message } = await FormRouter.list({ page: 1 });
            if (!success || !data) {
                return toast({ title: message, color: "danger" });
            }
            const { list } = data;
            setFormList(list.map((i) => i.form_name));
            if (list.length) {
                const form_name = list[0]?.form_name;
                setFormName(form_name);
                setPage(1);
                setIsLoading(true);
                const { success, data, message } = await FormFieldRouter.list({ form_name, page: 1 });
                if (!success || !data) {
                    setIsLoading(false);
                    return toast({ title: message, color: "danger" });
                }
                const { list: fields, total } = data;
                renderFormField(fields, total);
            }
        })();
    }, []);

    return (
        <div className="max-w-screen">
            <Header name={locale.Title} />
            <div className="w-full flex flex-col flex-wrap px-[5vw] pt-6 pb-2">
                <div className="flex flex-row justify-between items-center w-full py-2">
                    <div className="flex flex-row w-full">
                        {!!total && (
                            <Pagination
                                initialPage={1}
                                total={Math.ceil(total / 10)}
                                onChange={async (page: number) => {
                                    setPage(page);
                                    setIsLoading(true);
                                    const { success, data, message } = await FormFieldRouter.list({
                                        form_name: formName,
                                        page,
                                    });
                                    if (!success || !data) {
                                        return toast({ title: message, color: "danger" });
                                    }
                                    const { list, total } = data;
                                    renderFormField(list, total);
                                }}
                            />
                        )}
                    </div>
                    <div className="flex flex-row">
                        <Select
                            aria-label="formname"
                            className="mr-2 w-32 md:w-80"
                            variant="bordered"
                            selectedKeys={[formName]}
                            onSelectionChange={(keys) => chooseForm(keys.currentKey || null)}
                        >
                            {[...formList, locale.CreateNewForm].map((i, idx) => (
                                <SelectItem
                                    key={i}
                                    className={`${idx == formList.length ? "text-primary" : ""}`}
                                    onClick={() => (idx === formList.length ? openFormEditor() : null)}
                                >
                                    {i}
                                </SelectItem>
                            ))}
                        </Select>
                        <Button
                            onClick={() => setFieldEditorOpen(true)}
                            color="default"
                            variant="bordered"
                            className="text-black-500"
                        >
                            {locale.CreateNewField}
                        </Button>
                    </div>
                </div>
            </div>
            <div className="w-full flex flex-row flex-wrap px-[5vw] py-2 justify-between">
                <Table className="w-full" aria-label="table">
                    <TableHeader>
                        <TableColumn align="center">{locale.TableHeaderFieldNameColumn}</TableColumn>
                        <TableColumn align="center">{locale.TableHeaderFieldTypeColumn}</TableColumn>
                        <TableColumn align="center">{locale.TableHeaderOptionsColumn}</TableColumn>
                        <TableColumn align="center">{locale.TableHeaderRemarkColumn}</TableColumn>
                        <TableColumn align="center">{locale.TableHeaderHintColumn}</TableColumn>
                        <TableColumn align="center">{locale.TableHeaderActionsColumn}</TableColumn>
                    </TableHeader>
                    <TableBody
                        isLoading={isLoading}
                        loadingContent={
                            <div className="w-full h-full bg-[rgba(0,0,0,0.1)]">
                                <Spinner />
                            </div>
                        }
                    >
                        {formFieldList.map((field) => {
                            if (!field.radios) field.radios = [];
                            const TypeSelect = (
                                <Select
                                    variant="bordered"
                                    aria-label="select"
                                    className="w-36 mx-auto"
                                    defaultSelectedKeys={[
                                        FieldTypeList.find(({ type }) => type === field.field_type)?.type || "",
                                    ]}
                                    onSelectionChange={async (key) => {
                                        if (!key.currentKey) return;
                                        await FormFieldRouter.update({
                                            field_id: field.id,
                                            field_type: key.currentKey as FieldType,
                                        });
                                        chooseForm(formName);
                                    }}
                                >
                                    {FieldTypeList.map(({ name, type }) => (
                                        <SelectItem key={type}>{name}</SelectItem>
                                    ))}
                                </Select>
                            );
                            const RadioSelect = (
                                <Select
                                    hidden={!["checkbox", "select", "mulselect"].some((i) => i == field.field_type)}
                                    isOpen={!isRadioEditorOpen && field.id === focusFormField?.id}
                                    onOpenChange={(e) => {
                                        setFocusFormField(e ? field : null);
                                        setRadioEditorOpen(!e);
                                    }}
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
                                    defaultSelectedKeys={field.radios
                                        .filter((radio) => radio.useful)
                                        .map((radio) => radio.radio_name)}
                                    listboxProps={{
                                        emptyContent: <div className="text-center">{locale.TableBodyEmptyRadio}</div>,
                                        bottomContent: (
                                            <div
                                                className="text-center cursor-pointer"
                                                onClick={() => openRadioEditor()}
                                            >
                                                +
                                            </div>
                                        ),
                                    }}
                                >
                                    {field.radios.map(({ id: radio_id, radio_name, useful }) => (
                                        <SelectItem
                                            key={radio_name}
                                            onClick={async () => {
                                                await FormFieldRadioRouter.update({ radio_id, useful: !useful });
                                                chooseForm(formName);
                                            }}
                                        >
                                            {radio_name}
                                        </SelectItem>
                                    ))}
                                </Select>
                            );
                            return (
                                <TableRow key={field.id}>
                                    <TableCell className="min-w-48" align="center">
                                        <Input
                                            variant="bordered"
                                            defaultValue={field.field_name}
                                            onValueChange={async (field_name) => {
                                                await FormFieldRouter.update({ field_id: field.id, field_name });
                                                chooseForm(formName);
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="center" className="w-28">
                                        {TypeSelect}
                                    </TableCell>
                                    <TableCell align="center">{RadioSelect}</TableCell>
                                    <TableCell align="center" className="w-1/3">
                                        <Input
                                            placeholder={locale.TableBodyNoRemark}
                                            variant="bordered"
                                            defaultValue={field.comment}
                                            onValueChange={(comment) => {
                                                FormFieldRouter.update({ field_id: field.id, comment });
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell align="center" className="w-1/3">
                                        <Input
                                            placeholder={locale.TableBodyNoHint}
                                            variant="bordered"
                                            defaultValue={field.placeholder}
                                            onValueChange={(placeholder) => {
                                                FormFieldRouter.update({ field_id: field.id, placeholder });
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell className="min-w-40">
                                        <Button className="mr-1" variant="bordered" color="primary" size="sm">
                                            {locale.TableBodyUponSort}
                                        </Button>
                                        <Button variant="bordered" color="primary" size="sm">
                                            {locale.TableBodyDownSort}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
            <FormEditor
                isOpen={isFormEditorOpen}
                onOpenChange={(v: boolean) => {
                    setFormEditorOpen(v);
                }}
                onSubmit={async (data) => {
                    if ("form_name" in data) {
                        const form_name = data.form_name;
                        const { success } = await FormRouter.create({ form_name });
                        if (success) {
                            setFormEditorOpen(false);
                            setFormList([...formList, form_name]);
                            chooseForm(form_name);
                        } else {
                            toast({
                                title: locale.CreateFormFailed,
                                color: "danger",
                            });
                        }
                    }
                }}
            />
            {
                <FieldEditor
                    form_name={formName}
                    isOpen={isFieldEditorOpen}
                    onOpenChange={(v: boolean) => {
                        setFieldEditorOpen(v);
                    }}
                    onSubmit={async (data) => {
                        if ("form_name" in data) {
                            const form_name = data.form_name;
                            const field_name = data.field_name!;
                            const field_type = data.field_type!;
                            const { success } = await FormFieldRouter.create({ form_name, field_name, field_type });
                            if (success) {
                                setFieldEditorOpen(false);
                                chooseForm(form_name);
                            } else {
                                toast({ title: locale.CreateFieldFailed, color: "danger" });
                            }
                        }
                    }}
                />
            }
            {focusFormField && (
                <RadioEditor
                    field_id={focusFormField.id}
                    isOpen={isRadioEditorOpen}
                    onOpenChange={(v: boolean) => {
                        setRadioEditorOpen(v);
                    }}
                    onSubmit={async (data) => {
                        if ("radio_name" in data) {
                            const { success } = await FormFieldRadioRouter.create({
                                field_id: focusFormField.id,
                                radio_name: data.radio_name!,
                            });
                            if (success) {
                                setRadioEditorOpen(false);
                                chooseForm(formName);
                            } else {
                                toast({ title: locale.CreateRadioFailed, color: "danger" });
                            }
                        }
                    }}
                />
            )}
        </div>
    );
};

export default Component;
