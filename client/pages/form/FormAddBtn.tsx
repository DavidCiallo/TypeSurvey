import { Button } from "@/client/components/ui/button";
import { AcceptType, FileUpload } from "../../components/control/FileUpload";
import { Locale } from "../../methods/locale";

type props = {
    openFormEditor: () => void;
    uploadXlsx: (file: File | null) => void;
};

const FormAddBtn = ({ openFormEditor, uploadXlsx }: props) => {
    const locale = Locale("FormAddBtn");

    return (
        <div className="flex flex-row gap-2">
            <Button variant="outline" onClick={() => openFormEditor()}>
                {locale.CreateNewForm}
            </Button>
            <FileUpload
                element={
                    <Button variant="outline">{locale.ImportXlsx}</Button>
                }
                accept={[AcceptType.CSV, AcceptType.XLS, AcceptType.XLSX]}
                upload={uploadXlsx}
            />
        </div>
    );
};

export default FormAddBtn;
