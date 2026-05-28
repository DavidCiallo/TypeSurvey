import { authRoutes } from "../../shared/modules/auth/auth.router";
import { formRoutes } from "../../shared/modules/form/form.router";
import { fieldRoutes } from "../../shared/modules/field/field.router";
import { radioRoutes } from "../../shared/modules/radio/radio.router";
import { recordRoutes } from "../../shared/modules/record/record.router";
import { fileRoutes } from "../../shared/modules/file/file.router";
import { createClient } from "../lib/create-client";

export const AuthRouter = createClient(authRoutes);
export const FormRouter = createClient(formRoutes);
export const FieldRouter = createClient(fieldRoutes);
export const RadioRouter = createClient(radioRoutes);
export const RecordRouter = createClient(recordRoutes);
export const FileRouter = createClient(fileRoutes);
