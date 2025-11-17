import { Header } from "../../components/header/Header";
import { useEffect, useState } from "react";
import { Accordion, AccordionItem, Button } from "@heroui/react";
import { FormFieldCreateResponse } from "../../../shared/router/FieldRouter";
import { FormRouter } from "../../api/instance";
import FormEditor from "./FormEditor";
import { toast } from "../../methods/notify";
import { FormListResponse } from "../../../shared/router/FormRouter";

const Component = () => {
    const [formList, setFormList] = useState<string[]>([]);
    const [isFormEditorOpen, setFormEditorOpen] = useState(false);
    const [editMode, setEditMode] = useState<"create" | "edit">("create");
    const [focusForm, setFocusForm] = useState<string | null>(null);

    function openFormEditor(formname?: string) {
        if (formname) {
            setFocusForm(formname);
            setEditMode("edit");
        } else {
            setEditMode("create");
        }
        setFormEditorOpen(true);
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
                    {formList.map((form) => {
                        const title = <div className="text-lg font-bold">{form}</div>;
                        const subtitle = (
                            <div className="flex flex-row gap-3">
                                <div>共0条记录 </div>
                                <div>上次提交 12分钟前</div>
                            </div>
                        );
                        const indicator = (
                            <div className="flex flex-row gap-3">
                                <div className="text-sm text-primary">查看</div>
                                <div className="text-sm text-primary" onClick={() => openFormEditor(form)}>
                                    重命名
                                </div>
                                <div className="text-sm text-danger">发起收集</div>
                            </div>
                        );
                        return (
                            <AccordionItem
                                key={form}
                                aria-label={form}
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
                    onSubmit={(data) => {
                        if ("form_name" in data) {
                            const form_name = data.form_name;
                            if (!form_name) {
                                return toast({ title: "无效名称", color: "danger" });
                            }
                            if (editMode == "create") {
                                FormRouter.create({ form_name }, ({ success }: FormFieldCreateResponse) => {
                                    if (success) {
                                        setFormEditorOpen(false);
                                        setFormList([...formList, form_name]);
                                    } else {
                                        toast({ title: "同名表单已存在", color: "danger" });
                                    }
                                });
                            }
                            if (editMode == "edit") {
                                if (!focusForm) {
                                    return toast({ title: "参数异常", color: "danger" });
                                }
                                if (focusForm === form_name) {
                                    return toast({ title: "未修改", color: "danger" });
                                }
                                FormRouter.update(
                                    { origin_name: focusForm, new_name: form_name },
                                    ({ success }: FormFieldCreateResponse) => {
                                        if (success) {
                                            formList[formList.findIndex((n) => n === focusForm)] = form_name;
                                            setFormEditorOpen(false);
                                            setFormList([...formList]);
                                        } else {
                                            toast({ title: "同名表单已存在", color: "danger" });
                                        }
                                    },
                                );
                            }
                        }
                    }}
                />
            }
        </div>
    );
};

export default Component;
