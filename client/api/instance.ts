import { AuthRouterInstance } from "../../shared/router/AuthRouter";
import { FormFieldRouterInstance } from "../../shared/router/FieldRouter";
import { inject, injectws } from "../lib/inject";

export const AuthRouter = new AuthRouterInstance(inject);
export const FormFieldRouter = new FormFieldRouterInstance(inject);