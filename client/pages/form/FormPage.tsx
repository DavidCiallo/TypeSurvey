import { useEffect, useState } from "react";
import { FileRouter, FieldRouter, FormRouter, RecordRouter } from "../../api/instance";
import FormEditor from "./FormEditor";
import { toast } from "../../methods/notify";
import CreateRecordModal from "./RecordCreator";
import { FormFieldImpl } from "../../../shared/impl";
import { Locale } from "../../methods/locale";
import { getChunks } from "../../methods/file";
import FormList from "./FormList";
import FormAddBtn from "./FormAddBtn";
import { copytext } from "../../methods/text";
import FormImport from "./FormImport";
import { FieldCache, XlsxHeader } from "../../../shared/modules/file/file.interface";

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

    const [isImportLoading, setImportLoading] = useState(false);

    const [isNewRecordOpen, setNewRecordOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<"common" | "collect" | null>(null);

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
        const { success, data, message } = await FieldRouter.list({ form_name: formname, page: 1 });
        if (!success || !data) {
            return toast({ title: message, color: "danger" });
        }
        const list = data.list;
        if (!list || list.length == 0) {
            return toast({ title: locale.ToastFormListEmpty, color: "danger" });
        } else {
            setFieldList(list.filter((i) => !i.disabled && i.field_type == "text"));
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
        setImportLoading(true);
        try {
            const chunks = await getChunks(file);
            let result: { tempid: string; header: Array<XlsxHeader> } | null = null;
            for (const chunk of chunks) {
                const { success, data } = await FileRouter.readxlsx({ file: chunk });
                if (!success) {
                    toast({ title: Locale("Common").ToastNetworkError, color: "danger" });
                    return;
                }
                if (data?.tempid) {
                    result = data;
                }
            }
            if (result) {
                setTempid(result.tempid);
                setImportHeader(result.header);
                setImportOpen(true);
            }
        } finally {
            setImportLoading(false);
        }
    }
    async function comfirmImport(fields: Array<FieldCache>, usedata: boolean, timeFieldIndex?: number) {
        const { success } = await FileRouter.confirm({ fields, usedata, tempid, time_field_index: timeFieldIndex });
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
        <div className="mx-auto w-full max-w-5xl space-y-4">
            <div className="flex justify-end">
                <FormAddBtn openFormEditor={openFormEditor} uploadXlsx={uploadImportFile} importing={isImportLoading} />
            </div>
            <div>
                <FormList formList={formList} openFormEditor={openFormEditor} openRecordEditor={openRecordEditor} />
            </div>

            <FormEditor
                formName={focusForm}
                isOpen={isFormEditorOpen}
                onOpenChange={setFormEditorOpen}
                onSubmit={saveForm}
            />
            <FormImport
                isOpen={isImportOpen}
                onOpenChange={setImportOpen}
                header={importHeader}
                onSubmit={comfirmImport}
            />
            <CreateRecordModal
                isOpen={isNewRecordOpen}
                fields={fieldList}
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                onOpenChange={setNewRecordOpen}
                onCreate={createRecordLink}
            />
        </div>
    );
};

export default Component;
