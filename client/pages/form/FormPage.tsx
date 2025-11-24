import { Header } from "../../components/header/Header";
import { useEffect, useState } from "react";
import {
    FormFieldCreateResponse,
    FormFieldListResponse,
    FormFieldUpdateResponse,
} from "../../../shared/router/FieldRouter";
import { FileRouter, FormFieldRouter, FormRouter, RecordRouter } from "../../api/instance";
import FormEditor from "./FormEditor";
import { toast } from "../../methods/notify";
import { FormListResponse } from "../../../shared/router/FormRouter";
import CreateRecordModal from "./CreateRecordEditor";
import { FormFieldImpl } from "../../../shared/impl";
import { RecordGetResponse } from "../../../shared/router/RecordRouter";
import { Locale } from "../../methods/locale";
import { getChunks } from "../../methods/file";
import FormList from "./FormList";
import FormAddBtn from "./FormAddBtn";
import { copytext } from "../../methods/text";

const Component = () => {
    const locale = Locale("FormPage");

    const baseurl = location.protocol + "//" + location.host + "/fill?t=";

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
        FormFieldRouter.list({ form_name: formname, page: 1 }, ({ success, data, message }: FormFieldListResponse) => {
            if (!success || !data) {
                return toast({ title: message, color: "danger" });
            }
            const list = data.list;
            if (!list || list.length == 0) {
                return toast({ title: locale.ToastFormListEmpty, color: "danger" });
            } else {
                setFieldList(list);
                setNewRecordOpen(true);
            }
        });
    }

    async function saveForm({ form_name: new_name }: { form_name: string }) {
        if (!new_name) {
            return toast({ title: Locale("Common").ToastParamError, color: "danger" });
        }
        if (editMode == "create") {
            FormRouter.create({ form_name: new_name }, ({ success }: FormFieldCreateResponse) => {
                if (success) {
                    setFormEditorOpen(false);
                    setFormList([...formList, { form_name: new_name, records_num: 0, last_submit: 0 }]);
                } else {
                    toast({ title: locale.ToastCreateFormFailed, color: "danger" });
                }
            });
        }
        if (editMode == "edit") {
            if (!focusForm) {
                return toast({ title: Locale("Common").ToastParamError, color: "danger" });
            }
            if (focusForm === new_name) {
                return toast({ title: Locale("Common").ToastParamError, color: "danger" });
            }
            FormRouter.update({ form_name: focusForm, new_name }, ({ success }: FormFieldUpdateResponse) => {
                if (success) {
                    formList[formList.findIndex((n) => n.form_name === focusForm)].form_name = new_name;
                    setFormEditorOpen(false);
                    setFormList([...formList]);
                } else {
                    toast({ title: locale.ToastEditFormFailed, color: "danger" });
                }
            });
        }
    }

    async function createRecordLink(data?: { field_index: number; field_value: string }) {
        if (!data) {
            const url = baseurl + fieldList[0].id;
            navigator.clipboard.writeText(url);
            toast({ title: locale.ToastCopySuccess, color: "success" });
            return;
        }
        const { field_index, field_value } = data;
        const field_id = fieldList[field_index]?.id;
        if (!field_id || !field_value) {
            return toast({ title: Locale("Common").ToastParamError, color: "danger" });
        }
        RecordRouter.history({ id: field_id }, async ({ success, data, message }: RecordGetResponse) => {
            if (!success || !data) {
                return toast({ title: message, color: "danger" });
            }
            const { item_id, code } = data;
            RecordRouter.submit({ field_id, field_value, item_id });
            copytext(`${baseurl + item_id}#code:${code}`);
            toast({ title: locale.ToastCopySuccess, color: "success" });
        });
    }

    useEffect(() => {
        FormRouter.list({ page: 1 }, ({ success, data, message }: FormListResponse) => {
            if (!success || !data) {
                return toast({ title: message, color: "danger" });
            }
            const { list } = data;
            setFormList(list);
            if (data.list.length) {
                localStorage.setItem("formname", data.list[0].form_name);
            }
        });
    }, []);

    return (
        <div className="max-w-screen">
            <Header name={locale.Title} />
            <div className="w-full flex flex-col flex-wrap px-[5vw] pt-6 pb-2">
                <div className="flex flex-row justify-end items-center w-full py-2">
                    <FormAddBtn
                        openFormEditor={openFormEditor}
                        uploadXlsx={async (file) => {
                            if (!file) return;
                            const chunks = await getChunks(file);
                            chunks.forEach((file) => FileRouter.readxlsx({ file }));
                        }}
                    />
                </div>
                <div className="flex flex-row justify-center">
                    <FormList formList={formList} openFormEditor={openFormEditor} openRecordEditor={openRecordEditor} />
                </div>
            </div>

            <FormEditor isOpen={isFormEditorOpen} onOpenChange={setFormEditorOpen} onSubmit={saveForm} />
            <CreateRecordModal
                isOpen={isNewRecordOpen}
                fields={fieldList}
                onOpenChange={(v: boolean) => {
                    setNewRecordOpen(v);
                }}
                onCreate={createRecordLink}
            />
        </div>
    );
};

export default Component;
