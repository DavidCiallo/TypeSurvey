import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/client/components/ui/accordion";
import { Button } from "@/client/components/ui/button";
import { Locale } from "../../methods/locale";
import { useNavigate } from "react-router-dom";
import { EmptyComp } from "../../components/empty/Empty";

interface props {
    formList: Array<{ form_name: string; records_num: number; last_submit: number }>;
    openFormEditor: (form_name: string) => void;
    openRecordEditor: (form_name: string) => void;
}

function formatTime(ts: number): string {
    const d = new Date(ts);
    const M = String(d.getMonth() + 1).padStart(2, "0");
    const D = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${M}/${D} ${h}:${m}`;
}

const FormList = ({ formList, openFormEditor, openRecordEditor }: props) => {
    const locale = Locale("FormPage");
    const navigate = useNavigate();

    function viewRecords(formname: string) {
        localStorage.setItem("formname", formname);
        navigate("/record");
    }

    return (
        <div className="flex w-full flex-col">
            {formList.length === 0 && <EmptyComp height="min-h-[30vh]" opacity="opacity-50" />}
            <Accordion type="multiple">
                {formList.map(({ form_name, records_num, last_submit }) => (
                    <AccordionItem key={form_name} value={form_name}>
                        <AccordionTrigger
                            indicator={
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            viewRecords(form_name);
                                        }}
                                    >
                                        {locale.ViewRecordsButton}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            openFormEditor(form_name);
                                        }}
                                    >
                                        {locale.RenameButton}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            openRecordEditor(form_name);
                                        }}
                                    >
                                        {locale.CreateRecordButton}
                                    </Button>
                                </div>
                            }
                        >
                            <div className="flex flex-1 items-center justify-between gap-4 pr-4">
                                <div className="text-base font-semibold">{form_name}</div>
                                <div className="text-muted-foreground flex items-center gap-3 text-sm">
                                    <span>{locale.RecordNumLabel + " " + records_num}</span>
                                    {last_submit ? (
                                        <span>{formatTime(last_submit)}</span>
                                    ) : (
                                        <span>{locale.EmptyNumLabel}</span>
                                    )}
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent />
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
};

export default FormList;
