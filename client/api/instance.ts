import { AuthRouterInstance } from "../../shared/router/AuthRouter";
import { FormRouterInstance } from "../../shared/router/FormRouter";
import { FormFieldRouterInstance } from "../../shared/router/FieldRouter";
import { inject, injectws } from "../lib/inject";

export const AuthRouter = new AuthRouterInstance(inject);
export const FormRouter = new FormRouterInstance(inject);
export const FormFieldRouter = new FormFieldRouterInstance(inject);