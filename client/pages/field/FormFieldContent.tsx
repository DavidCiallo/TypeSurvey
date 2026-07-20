import { FormFieldImpl } from "../../../shared/impl";
import { Button } from "@/client/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/client/components/ui/dialog";
import { Locale } from "../../methods/locale";

interface props {
    filed: FormFieldImpl;
    isOpen: boolean;
    onOpenChange: any;
}

const FormFieldContentModal = ({ isOpen, onOpenChange }: props) => {
    const locale = Locale("FormFieldContent");
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{locale.FieldDetail}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col">
                    <div className="flex flex-col md:flex-row md:justify-start md:items-center"></div>
                    <div className="mt-3"></div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {Locale("Common").ButtonClose}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default FormFieldContentModal;
