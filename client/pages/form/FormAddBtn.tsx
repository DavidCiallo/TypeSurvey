import { Button } from "@/client/components/ui/button";
import { Loader2 } from "lucide-react";
import { AcceptType, FileUpload } from "../../components/control/FileUpload";
import { Locale } from "../../methods/locale";

type props = {
    openFormEditor: () => void;
    uploadXlsx: (file: File | null) => void;
    importing?: boolean;
};

const FormAddBtn = ({ openFormEditor, uploadXlsx, importing }: props) => {
    const locale = Locale("FormAddBtn");

    return (
        <div className="flex flex-row gap-2">
            <Button variant="outline" onClick={() => openFormEditor()}>
                {locale.CreateNewForm}
            </Button>
            <FileUpload
                element={
                    <Button variant="outline" disabled={importing}>
                        {importing && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                        {locale.ImportXlsx}
                    </Button>
                }
                accept={[AcceptType.CSV, AcceptType.XLS, AcceptType.XLSX]}
                upload={uploadXlsx}
            />
        </div>
    );
};

export default FormAddBtn;
