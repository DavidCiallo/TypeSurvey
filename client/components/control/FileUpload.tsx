import { ChangeEvent, ReactElement, cloneElement, useRef } from "react";

export enum AcceptType {
    Image = "image/*",
    Audio = "audio/*",
    Video = "video/*",
    CSV = ".csv",
    XLS = "application/vnd.ms-excel",
    XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
export const FileUpload = ({
    element,
    accept,
    upload,
}: {
    element: ReactElement;
    accept: AcceptType | AcceptType[] | string;
    upload: (file: File | null) => void;
}) => {
    const fileInputRef = useRef(null);
    const handleTriggerClick = () => {
        if (fileInputRef?.current) {
            (fileInputRef.current as HTMLInputElement).click();
        }
    };

    function update(event: ChangeEvent<HTMLInputElement>): void {
        const file = event.target?.files?.[0];
        event.target.value = "";
        upload(file || null);
    }

    if (accept instanceof Array) {
        accept = accept.join(", ");
    }

    const input = <input type="file" ref={fileInputRef} onChange={update} accept={accept} />;
    return (
        <div onClick={handleTriggerClick}>
            <div style={{ display: "none" }}>{input}</div>
            <div style={{ pointerEvents: "none" }}>{element}</div>
        </div>
    );
};
