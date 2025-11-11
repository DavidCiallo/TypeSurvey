import { FieldType } from "../../../shared/impl/field";

export const FieldTypeList: Array<{
    name: string;
    type: FieldType;
}> = [
        { name: "文本", type: "text" },
        { name: "邮箱", type: "email" },
        { name: "密码", type: "password" },
        { name: "复选框", type: "checkbox" },
        { name: "单选项", type: "select" },
        { name: "多选项", type: "mulselect" },
        { name: "多行文本", type: "textarea" },
    ];