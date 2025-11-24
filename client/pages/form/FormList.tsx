import { Accordion, AccordionItem } from "@heroui/react";
import { Locale } from "../../methods/locale";
import { useNavigate } from "react-router-dom";

interface props {
    formList: Array<{ form_name: string; records_num: number; last_submit: number }>;
    openFormEditor: (form_name: string) => void;
    openRecordEditor: (form_name: string) => void;
}

const FormList = ({ formList, openFormEditor, openRecordEditor }: props) => {
    const locale = Locale("FormPage");
    const navigate = useNavigate();

    function viewRecords(formname: string) {
        localStorage.setItem("formname", formname);
        navigate("/record");
    }
    return (
        <Accordion selectedKeys={[]}>
            {formList.map(({ form_name, records_num, last_submit }) => {
                const title = <div className="text-lg font-bold">{form_name}</div>;
                const subtitle = (
                    <div className="flex flex-row gap-3">
                        <div>{locale.RecordNumLabel + " " + records_num}</div>
                        {!!last_submit && <div>{new Date(last_submit).toLocaleString().slice(5, 16)}</div>}
                        {!last_submit && <div>{locale.EmptyNumLabel}</div>}
                    </div>
                );
                const indicator = (
                    <div className="flex flex-row gap-3">
                        <div className="text-sm text-primary" onClick={() => viewRecords(form_name)}>
                            {locale.ViewRecordsButton}
                        </div>
                        <div className="text-sm text-primary" onClick={() => openFormEditor(form_name)}>
                            {locale.RenameButton}
                        </div>
                        <div className="text-sm text-danger" onClick={() => openRecordEditor(form_name)}>
                            {locale.CreateRecordButton}
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
    );
};

export default FormList;
