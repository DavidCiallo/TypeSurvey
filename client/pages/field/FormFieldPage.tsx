import { Header } from "../../components/header/Header";
import { useEffect, useState } from "react";
import { FormFieldImpl } from "../../../shared/impl";
import { FormRouter, FormFieldRouter, FormFieldRadioRouter } from "../../api/instance";
import FieldEditor from "./FormFieldEditor";
import RadioEditor from "./FormFieldRadioEditor";
import { toast } from "../../methods/notify";
import FormFieldTable from "./FormFieldTable";
import { Locale } from "../../methods/locale";
import { FormFieldCreateRequest, FormFieldUpdateRequest } from "../../../shared/router/FieldRouter";
import { FormFieldRadioCreateRequest, FormFieldRadioUpdateRequest } from "../../../shared/router/RadioRouter";
import FormFieldHeader from "./FormFieldHeader";

const Component = () => {
    const locale = Locale("FormFieldPage");

    const [formName, setFormName] = useState<string>("");
    const [formList, setFormList] = useState<string[]>([]);
    const [formFieldList, setFormFieldList] = useState<FormFieldImpl[]>([]);
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState(1);

    const [focusFormField, setFocusFormField] = useState<FormFieldImpl | null>(null);
    const [isFieldEditorOpen, setFieldEditorOpen] = useState(false);
    const [isRadioEditorOpen, setRadioEditorOpen] = useState(false);

    async function loadFormFields(form_name: string, page: number = 1) {
        if (formName !== form_name) {
            setFormName(form_name);
            const { success, data, message } = await FormFieldRouter.list({ form_name, page });
            if (!success || !data) {
                return toast({ title: message, color: "danger" });
            }
            const { list, total } = data;
            renderFormField(list, total);
        } else {
            const { success, data, message } = await FormFieldRouter.list({ form_name, page });
            if (!success || !data) {
                return toast({ title: message, color: "danger" });
            }
            const { list, total } = data;
            renderFormField(list, total);
        }
        setPage(page);
    }

    async function saveField(field: FormFieldCreateRequest | FormFieldUpdateRequest) {
        if (!("form_name" in field)) {
            return;
        }
        const form_name = field.form_name;
        const field_name = field.field_name!;
        const field_type = field.field_type!;
        const { success } = await FormFieldRouter.create({ form_name, field_name, field_type });
        if (success) {
            setFieldEditorOpen(false);
            loadFormFields(form_name, page);
        } else {
            toast({ title: locale.CreateFieldFailed, color: "danger" });
        }
    }

    async function saveRadio(radio: FormFieldRadioCreateRequest | FormFieldRadioUpdateRequest) {
        if (!("radio_name" in radio) || !focusFormField) {
            return;
        }
        const { success } = await FormFieldRadioRouter.create({
            field_id: focusFormField.id,
            radio_name: radio.radio_name!,
        });
        if (success) {
            setRadioEditorOpen(false);
            loadFormFields(formName, page);
        } else {
            toast({ title: locale.CreateRadioFailed, color: "danger" });
        }
    }

    async function updateField(field_id: string, key: string, value: string | number | boolean) {
        await FormFieldRouter.update({ field_id, [key]: value });
        await loadFormFields(formName, page);
    }

    async function updateRadio(radio_id: string, key: string, value: string | number | boolean) {
        await FormFieldRadioRouter.update({ radio_id, [key]: value });
        await loadFormFields(formName, page);
    }

    function renderFormField(list: FormFieldImpl[], total: number) {
        setTotal(total);
        setFormFieldList(list);
    }

    useEffect(() => {
        (async () => {
            const { success, data, message } = await FormRouter.list({ page: 1 });
            if (!success || !data) {
                return toast({ title: message, color: "danger" });
            }
            const { list } = data;
            setFormList(list.map((i) => i.form_name));
            if (list.length === 0) return;
            loadFormFields(list[0].form_name);
        })();
    }, []);

    return (
        <div className="max-w-screen">
            <Header name={locale.Title} />
            <FormFieldHeader
                total={total}
                page={page}
                formList={formList}
                currentFormName={formName}
                openFieldEditor={setFieldEditorOpen}
                loadFormFields={loadFormFields}
            />
            <FormFieldTable
                total={total}
                page={page}
                formFieldList={formFieldList}
                focusFormFieldId={focusFormField?.id || null}
                isRadioEditorOpen={isRadioEditorOpen}
                changeFocusField={(id) => setFocusFormField(formFieldList.find((i) => i.id === id) || null)}
                changeRadioEditorOpen={setRadioEditorOpen}
                updateField={updateField}
                updateRadio={updateRadio}
            />
            <FieldEditor
                form_name={formName}
                isOpen={isFieldEditorOpen}
                onOpenChange={setFieldEditorOpen}
                onSubmit={saveField}
            />
            <RadioEditor
                field_id={focusFormField?.id || null}
                isOpen={isRadioEditorOpen}
                onOpenChange={setRadioEditorOpen}
                onSubmit={saveRadio}
            />
        </div>
    );
};

export default Component;
