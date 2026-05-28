import { Button } from "@heroui/react";
import { AcceptType, FileUpload } from "../../components/control/FileUpload";
import { Locale } from "../../methods/locale";

type props = {
    openFormEditor: () => void;
    uploadXlsx: (file: File | null) => void;
};

const FormAddBtn = ({ openFormEditor, uploadXlsx }: props) => {
    const locale = Locale("FormAddBtn");

    return (
        <div className="flex flex-row">
            <Button onClick={() => openFormEditor()} color="default" variant="bordered" className="text-black-500">
                {locale.CreateNewForm}
            </Button>
            <FileUpload
                element={
                    <Button color="default" variant="bordered" className="text-black-500 ml-1">
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
