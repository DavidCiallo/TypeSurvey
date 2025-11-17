import { AuthRouterInstance } from "../../shared/router/AuthRouter";
import { FormRouterInstance } from "../../shared/router/FormRouter";
import { FormFieldRouterInstance } from "../../shared/router/FieldRouter";
import { FormFieldRadioRouterInstance } from "../../shared/router/RadioRouter";
import { inject, injectws } from "../lib/inject";
import { RecordRouterInstance } from "../../shared/router/RecordRouter";

export const AuthRouter = new AuthRouterInstance(inject);
export const FormRouter = new FormRouterInstance(inject);
export const FormFieldRouter = new FormFieldRouterInstance(inject);
export const FormFieldRadioRouter = new FormFieldRadioRouterInstance(inject);
export const RecordRouter = new RecordRouterInstance(inject);
