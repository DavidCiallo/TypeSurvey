import { Header } from "../../components/header/Header";
import { useEffect, useState } from "react";
import { FileRouter, FormFieldRouter, FormRouter, RecordRouter } from "../../api/instance";
import FormEditor from "./FormEditor";
import { toast } from "../../methods/notify";
import CreateRecordModal from "./CreateRecordEditor";
import { FormFieldImpl } from "../../../shared/impl";
import { Locale } from "../../methods/locale";
import { getChunks } from "../../methods/file";
import FormList from "./FormList";
import FormAddBtn from "./FormAddBtn";
import { copytext } from "../../methods/text";
import FormImport from "./FormImport";
import { FieldCache, XlsxHeader } from "../../../shared/router/FileRouter";

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
    const [tempid, setTempid] = useState("");
    const [isImportOpen, setImportOpen] = useState(false);
    const [importHeader, setImportHeader] = useState<Array<XlsxHeader>>([]);
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

    async function openRecordEditor(formname: string) {
        setFocusForm(formname);
        const { success, data, message } = await FormFieldRouter.list({ form_name: formname, page: 1 });
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
    }

    async function saveForm({ form_name: new_name }: { form_name: string }) {
        if (!new_name) {
            return toast({ title: Locale("Common").ToastParamError, color: "danger" });
        }
        if (editMode == "create") {
            const { success } = await FormRouter.create({ form_name: new_name });
            if (success) {
                setFormEditorOpen(false);
                setFormList([...formList, { form_name: new_name, records_num: 0, last_submit: 0 }]);
            } else {
                toast({ title: locale.ToastCreateFormFailed, color: "danger" });
            }
        }
        if (editMode == "edit") {
            if (!focusForm) {
                return toast({ title: Locale("Common").ToastParamError, color: "danger" });
            }
            if (focusForm === new_name) {
                return toast({ title: Locale("Common").ToastParamError, color: "danger" });
            }
            const { success } = await FormRouter.update({ form_name: focusForm, new_name });
            if (success) {
                formList[formList.findIndex((n) => n.form_name === focusForm)].form_name = new_name;
                setFormEditorOpen(false);
                setFormList([...formList]);
            } else {
                toast({ title: locale.ToastEditFormFailed, color: "danger" });
            }
        }
    }

    async function createRecordLink(data?: { field_index: number; field_value: string }) {
        if (!data) {
            copytext(baseurl + fieldList[0].id);
            toast({ title: locale.ToastCopySuccess, color: "success" });
            return;
        }
        const { field_index, field_value } = data;
        const field_id = fieldList[field_index]?.id;
        if (!field_id || !field_value) {
            return toast({ title: Locale("Common").ToastParamError, color: "danger" });
        }
        const { success, data: existData, message } = await RecordRouter.history({ id: field_id });
        if (!success || !existData) {
            return toast({ title: message, color: "danger" });
        }
        const { item_id, code } = existData;
        RecordRouter.submit({ field_id, field_value, item_id });
        copytext(`${baseurl + item_id}#code:${code}`);
        toast({ title: locale.ToastCopySuccess, color: "success" });
    }

    async function uploadImportFile(file: File | null) {
        if (!file) return;
        const chunks = await getChunks(file);
        chunks.forEach(async (file) => {
            const { success, data } = await FileRouter.readxlsx({ file });
            if (!success || !data) return;
            console.log(data);
            const { tempid, header } = data;
            setTempid(tempid);
            setImportOpen(true);
            setImportHeader(header);
        });
    }
    async function comfirmImport(fields: Array<FieldCache>) {
        const { success } = await FileRouter.confirm({ fields, usedata: true, tempid });
        if (success) {
            toast({ title: "Success", color: "success" });
        } else {
            toast({ title: "Fail", color: "danger" });
        }
        setImportOpen(false);
        {
            const { success, data, message } = await FormRouter.list({ page: 1 });
            if (!success || !data) {
                return toast({ title: message, color: "danger" });
            }
            const { list } = data;
            setFormList(list);
            if (data.list.length) {
                localStorage.setItem("formname", data.list[0].form_name);
            }
        }
    }

    useEffect(() => {
        (async () => {
            const { success, data, message } = await FormRouter.list({ page: 1 });
            if (!success || !data) {
                return toast({ title: message, color: "danger" });
            }
            const { list } = data;
            setFormList(list);
            if (data.list.length) {
                localStorage.setItem("formname", data.list[0].form_name);
            }
        })();
    }, []);

    return (
        <div className="max-w-screen">
            <Header name={locale.Title} />
            <div className="w-full flex flex-col flex-wrap px-[5vw] pt-6 pb-2">
                <div className="flex flex-row justify-end items-center w-full py-2">
                    <FormAddBtn openFormEditor={openFormEditor} uploadXlsx={uploadImportFile} />
                </div>
                <div className="flex flex-row justify-center">
                    <FormList formList={formList} openFormEditor={openFormEditor} openRecordEditor={openRecordEditor} />
                </div>
            </div>

            <FormEditor isOpen={isFormEditorOpen} onOpenChange={setFormEditorOpen} onSubmit={saveForm} />
            <FormImport
                isOpen={isImportOpen}
                onOpenChange={setImportOpen}
                header={importHeader}
                onSubmit={comfirmImport}
            />
            <CreateRecordModal
                isOpen={isNewRecordOpen}
                fields={fieldList}
                onOpenChange={setNewRecordOpen}
                onCreate={createRecordLink}
            />
        </div>
    );
};

export default Component;
