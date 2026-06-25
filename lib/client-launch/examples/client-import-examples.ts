import { getCusickImportExampleJson } from "./cusick-motorsports-import";
import {
  getSpurImportExampleJson,
  SPUR_IMPORT_RAW_NOTES,
} from "./spur-restaurant-import";
import {
  getEDavisImportExampleJson,
  E_DAVIS_IMPORT_RAW_NOTES,
} from "./e-davis-enterprises-import";
import {
  getAutoDV8ionsImportExampleJson,
  AUTODV8IONS_IMPORT_RAW_NOTES,
} from "./autodv8ions-import";
import {
  getDcogtImportExampleJson,
  DCOGT_IMPORT_RAW_NOTES,
} from "./dcogt-import";

export interface ClientImportExampleEntry {
  label: string;
  getJson: () => string;
  rawNotes?: string;
}

/** Canonical list of Client Import example loaders — keep in sync with example files. */
export const CLIENT_IMPORT_EXAMPLES: ClientImportExampleEntry[] = [
  {
    label: "Load AutoDV8ions Example",
    getJson: getAutoDV8ionsImportExampleJson,
    rawNotes: AUTODV8IONS_IMPORT_RAW_NOTES,
  },
  {
    label: "Load E. Davis Example",
    getJson: getEDavisImportExampleJson,
    rawNotes: E_DAVIS_IMPORT_RAW_NOTES,
  },
  {
    label: "Load SPUR Example",
    getJson: getSpurImportExampleJson,
    rawNotes: SPUR_IMPORT_RAW_NOTES,
  },
  {
    label: "Load Cusick Example",
    getJson: getCusickImportExampleJson,
  },
  {
    label: "Load DCoGT Example",
    getJson: getDcogtImportExampleJson,
    rawNotes: DCOGT_IMPORT_RAW_NOTES,
  },
];
