import { Header } from "../../components/header/Header";
import { useEffect, useState } from "react";
import { Button, Form, Input, Pagination, Select, SelectItem, Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { FormFieldImpl } from "../../../shared/impl";
import { FormFieldCreateResponse, FormFieldListResponse } from "../../../shared/router/FieldRouter";
import { FormRouter, FormFieldRouter } from "../../api/instance";
import FormEditor from "./FormEditor";
import FieldEditor from "./FormFieldEditor";
import { toast } from "../../methods/notify";
import { FormListResponse } from "../../../shared/router/FormRouter";
import { FieldTypeList } from "./types";

const Component = () => {
    const [formName, setFormName] = useState<string>("");
    const [formList, setFormList] = useState<string[]>([]);
    const [formFieldList, setFormFieldList] = useState<FormFieldImpl[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const [focusFormField, setFocusFormField] = useState<FormFieldImpl | null>(null);
    const [isFormEditorOpen, setFormEditorOpen] = useState(false);
    const [isFieldEditorOpen, setFieldEditorOpen] = useState(false);

    function chooseForm(name: string | null) {
        if (!name || !formList.includes(name)) return;
        setFormName(name);
        setPage(1);
        setIsLoading(true);
        FormFieldRouter.list({ form_name: name, page: 1 }, renderFormField);
    }

    function openFormEditor(formname?: string) {
        setFormEditorOpen(true);
    }

    function renderFormField(data: FormFieldListResponse) {
        setTotal(data.total);
        setFormFieldList(data.list);
        setIsLoading(false);
    }

    useEffect(() => {
        FormRouter.list({ page: 1 }, (data: FormListResponse) => {
            setFormList(data.list)
            if (data.list.length) {
                const form_name = data.list[0];
                const page = 1;
                setFormName(form_name);
                setPage(page);
                setIsLoading(true);
                FormFieldRouter.list({ form_name, page: 1 }, renderFormField);
            }
        });
    }, [])

    return (
        <div className="max-w-screen">
            <Header name="表单管理" />
            <div className="w-full flex flex-col flex-wrap px-[5vw] pt-6 pb-2">
                <div className="flex flex-row justify-between items-center w-full py-2">
                    <div className="flex flex-row w-full">
                        {!!total &&
                            <Pagination
                                initialPage={1} total={Math.ceil(total / 10)}
                                onChange={(page: number) => {
                                    setPage(page);
                                    setIsLoading(true);
                                    formName && FormFieldRouter.list({ form_name: formName, page }, renderFormField)
                                }}
                            />
                        }
                    </div>
                    <div className="flex flex-row">
                        <Select
                            aria-label="formname"
                            className="mr-2 w-32 md:w-80" variant="bordered"
                            selectedKeys={[formName]}
                            onSelectionChange={(keys) => chooseForm(keys.currentKey || null)}
                        >
                            {[...formList, "创建新表单"].map((i, idx) => (
                                <SelectItem key={i}
                                    className={`${idx == formList.length ? "text-primary" : ""}`}
                                    onClick={() => idx === formList.length ? openFormEditor() : null}
                                >
                                    {i}
                                </SelectItem>
                            ))}
                        </Select>
                        <Button
                            onClick={() => setFieldEditorOpen(true)}
                            color="default" variant="bordered" className="text-black-500"
                        >
                            新建字段
                        </Button>
                    </div>
                </div>
            </div>
            <div className="w-full flex flex-row flex-wrap px-[5vw] py-2 justify-between">
                <Table className="w-full" aria-label="table">
                    <TableHeader>
                        <TableColumn align="center">字段名称</TableColumn>
                        <TableColumn align="center">字段类型</TableColumn>
                        <TableColumn align="center">可选择项</TableColumn>
                        <TableColumn align="center">备注（用户可见）</TableColumn>
                        <TableColumn align="center">操作</TableColumn>
                    </TableHeader>
                    <TableBody
                        isLoading={isLoading}
                        loadingContent={<div className="w-full h-full bg-[rgba(0,0,0,0.1)]"><Spinner /></div>}
                    >
                        {formFieldList.map((field) => (
                            <TableRow key={field.id}>
                                <TableCell className="w-48" align="center">
                                    <Input variant="bordered" defaultValue={field.field_name} />
                                </TableCell>
                                <TableCell className="w-32">
                                    <Select
                                        variant="bordered" aria-label="select"
                                        defaultSelectedKeys={[FieldTypeList.find(({ type }) => type === field.field_type)?.type || ""]}
                                    >
                                        {FieldTypeList.map(({ name, type }) => (<SelectItem key={type}>{name}</SelectItem>))}
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Select
                                        variant="bordered" aria-label="select" selectionMode="multiple"
                                        renderValue={(selectedKeys) => `已设置 ${selectedKeys.length} 项`}
                                        defaultSelectedKeys={[FieldTypeList.find(({ type }) => type === field.field_type)?.type || ""]}
                                    >
                                        {FieldTypeList.map(({ name, type }) => (<SelectItem key={type}>{name}</SelectItem>))}
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Input placeholder="无备注" variant="bordered" defaultValue={""} />
                                </TableCell>
                                <TableCell className="w-60">
                                    <Button className="mr-1" variant="bordered" color="primary" size="sm" onClick={() => setFocusFormField(field)}>
                                        上升
                                    </Button>
                                    <Button variant="bordered" color="primary" size="sm" onClick={() => setFocusFormField(field)}>
                                        下降
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            {
                <FormEditor
                    isOpen={isFormEditorOpen}
                    onOpenChange={(v: boolean) => {
                        setFormEditorOpen(v);
                    }}
                    onSubmit={(data) => {
                        if ("form_name" in data) {
                            const form_name = data.form_name;
                            FormRouter.create({ form_name }, ({ success }: FormFieldCreateResponse) => {
                                if (success) {
                                    setFormEditorOpen(false);
                                    setFormList([...formList, form_name]);
                                    setFormName(form_name);
                                    setPage(1);
                                    setIsLoading(true);
                                    FormFieldRouter.list({ form_name, page: 1 }, renderFormField);
                                } else {
                                    toast({ title: "同名表单已存在", color: "danger" });
                                }
                            });
                        }
                    }}
                />
            }
            {
                <FieldEditor
                    form_name={formName}
                    isOpen={isFieldEditorOpen}
                    onOpenChange={(v: boolean) => {
                        setFieldEditorOpen(v);
                    }}
                    onSubmit={(data) => {
                        if ("form_name" in data) {
                            const form_name = data.form_name;
                            const field_name = data.field_name!;
                            const field_type = data.field_type!;
                            FormFieldRouter.create(
                                { form_name, field_name, field_type },
                                ({ success }: FormFieldCreateResponse) => {
                                    if (success) {
                                        setFieldEditorOpen(false);
                                        setPage(1);
                                        setIsLoading(true);
                                        FormFieldRouter.list({ form_name, page: 1 }, renderFormField);
                                    } else {
                                        toast({ title: "同名字段已存在", color: "danger" });
                                    }
                                });
                        }
                    }}
                />
            }
        </div >
    )
};


export default Component;