import { Header } from "../../components/header/Header";
import { useEffect, useState } from "react";
import { Accordion, AccordionItem, Button } from "@heroui/react";
import {
    FormFieldCreateResponse,
    FormFieldListResponse,
    FormFieldUpdateResponse,
} from "../../../shared/router/FieldRouter";
import { FormFieldRouter, FormRouter, RecordRouter } from "../../api/instance";
import FormEditor from "./FormEditor";
import { toast } from "../../methods/notify";
import { FormListResponse } from "../../../shared/router/FormRouter";
import CreateRecordModal from "./CreateRecordEditor";
import { FormFieldImpl } from "../../../shared/impl";
import { RecordGetResponse } from "../../../shared/router/RecordRouter";

const Component = () => {
    const baseurl = location.host + "/fill?t=";

    const [formList, setFormList] = useState<
        Array<{
            form_name: string;
            records_num: number;
            last_submit: number;
        }>
    >([]);
    const [fieldList, setFieldList] = useState<FormFieldImpl[]>([]);

    const [isFormEditorOpen, setFormEditorOpen] = useState(false);
    const [editMode, setEditMode] = useState<"create" | "edit">("create");
    const [focusForm, setFocusForm] = useState<string | null>(null);

    const [isNewRecordOpen, setNewRecordOpen] = useState(false);

    function openFormEditor(formname?: string) {
        if (formname) {
            setFocusForm(formname);
            setEditMode("edit");
        } else {
            setEditMode("create");
        }
        setFormEditorOpen(true);
    }

    function openRecordEditor(formname: string) {
        setFocusForm(formname);
        FormFieldRouter.list({ form_name: formname, page: 1 }, (data: FormFieldListResponse) => {
            const { list } = data;
            if (!list || list.length == 0) {
                return toast({ title: "表单错误，可能不存在或者为空", color: "danger" });
            } else {
                setFieldList(list);
                setNewRecordOpen(true);
            }
        });
    }

    async function saveForm(new_name: string) {
        if (!new_name) {
            return toast({ title: "无效名称", color: "danger" });
        }
        if (editMode == "create") {
            FormRouter.create({ form_name: new_name }, ({ success }: FormFieldCreateResponse) => {
                if (success) {
                    setFormEditorOpen(false);
                    setFormList([...formList, { form_name: new_name, records_num: 0, last_submit: 0 }]);
                } else {
                    toast({ title: "同名表单已存在", color: "danger" });
                }
            });
        }
        if (editMode == "edit") {
            if (!focusForm) {
                return toast({ title: "参数异常", color: "danger" });
            }
            if (focusForm === new_name) {
                return toast({ title: "未修改", color: "danger" });
            }
            FormRouter.update({ form_name: focusForm, new_name }, ({ success }: FormFieldUpdateResponse) => {
                if (success) {
                    formList[formList.findIndex((n) => n.form_name === focusForm)].form_name = new_name;
                    setFormEditorOpen(false);
                    setFormList([...formList]);
                } else {
                    toast({ title: "同名表单已存在", color: "danger" });
                }
            });
        }
    }

    async function createRecordLink(data?: { field_index: number; field_value: string }) {
        if (!data) {
            const url = baseurl + fieldList[0].id;
            navigator.clipboard.writeText(url);
            toast({ title: "复制成功", color: "success" });
            return;
        }
        const { field_index, field_value } = data;
        const field_id = fieldList[field_index]?.id;
        if (!field_id || !field_value) {
            toast({ title: "参数错误", color: "danger" });
            return;
        }
        RecordRouter.history({ id: field_id }, async ({ item_id, code }: RecordGetResponse) => {
            RecordRouter.submit({ field_id, field_value, item_id });
            const url = `${baseurl + item_id}#code:${code}`;
            navigator.clipboard.writeText(url);
            toast({ title: "复制成功，请注意信息安全", color: "success" });
        });
    }

    useEffect(() => {
        FormRouter.list({ page: 1 }, (data: FormListResponse) => {
            setFormList(data.list);
        });
    }, []);

    return (
        <div className="max-w-screen">
            <Header name="表单列表" />
            <div className="w-full flex flex-col flex-wrap px-[5vw] pt-6 pb-2">
                <div className="flex flex-row justify-end items-center w-full py-2">
                    <div className="flex flex-row">
                        <Button
                            onClick={() => openFormEditor()}
                            color="default"
                            variant="bordered"
                            className="text-black-500"
                        >
                            新建表单
                        </Button>
                    </div>
                </div>
                <Accordion selectedKeys={[]}>
                    {formList.map(({ form_name, records_num, last_submit }) => {
                        const title = <div className="text-lg font-bold">{form_name}</div>;
                        const subtitle = (
                            <div className="flex flex-row gap-3">
                                <div>共{records_num}条记录 </div>
                                {last_submit && <div>{new Date(last_submit).toLocaleString()}</div>}
                                {!last_submit && <div>暂无记录</div>}
                            </div>
                        );
                        const indicator = (
                            <div className="flex flex-row gap-3">
                                <div className="text-sm text-primary">查看</div>
                                <div className="text-sm text-primary" onClick={() => openFormEditor(form_name)}>
                                    重命名
                                </div>
                                <div className="text-sm text-danger" onClick={() => openRecordEditor(form_name)}>
                                    生成链接
                                </div>
                            </div>
                        );
                        return (
                            <AccordionItem
                                key={form_name}
                                aria-label={form_name}
                                title={title}
                                subtitle={subtitle}
                                indicator={indicator}
                            ></AccordionItem>
                        );
                    })}
                </Accordion>
            </div>

            {
                <FormEditor
                    isOpen={isFormEditorOpen}
                    onOpenChange={(v: boolean) => {
                        setFormEditorOpen(v);
                    }}
                    onSubmit={({ form_name }) => saveForm(form_name)}
                />
            }
            {
                <CreateRecordModal
                    isOpen={isNewRecordOpen}
                    fields={fieldList}
                    onOpenChange={(v: boolean) => {
                        setNewRecordOpen(v);
                    }}
                    onCreate={createRecordLink}
                />
            }
        </div>
    );
};

export default Component;
