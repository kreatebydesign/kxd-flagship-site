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
import {
  getHairMafiaImportExampleJson,
  HAIR_MAFIA_IMPORT_RAW_NOTES,
} from "./hair-mafia-import";
import {
  getOnTrackPerformanceImportExampleJson,
  ON_TRACK_PERFORMANCE_IMPORT_RAW_NOTES,
} from "./on-track-performance-import";
import {
  getOtpCartsImportExampleJson,
  OTP_CARTS_IMPORT_RAW_NOTES,
} from "./otp-carts-import";
import {
  getDialedInElectricImportExampleJson,
  DIALED_IN_ELECTRIC_IMPORT_RAW_NOTES,
} from "./dialed-in-electric-import";
import {
  getPlateTheUmpquaImportExampleJson,
  PLATE_THE_UMPQUA_IMPORT_RAW_NOTES,
} from "./plate-the-umpqua-import";
import {
  getLaCocinaImportExampleJson,
  LA_COCINA_IMPORT_RAW_NOTES,
} from "./la-cocina-import";
import {
  getTownsgate2475ImportExampleJson,
  TOWNSGATE_2475_IMPORT_RAW_NOTES,
} from "./2475-townsgate-import";

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
  {
    label: "Load Hair Mafia Example",
    getJson: getHairMafiaImportExampleJson,
    rawNotes: HAIR_MAFIA_IMPORT_RAW_NOTES,
  },
  {
    label: "Load On Track Performance Example",
    getJson: getOnTrackPerformanceImportExampleJson,
    rawNotes: ON_TRACK_PERFORMANCE_IMPORT_RAW_NOTES,
  },
  {
    label: "Load OTP Carts Example",
    getJson: getOtpCartsImportExampleJson,
    rawNotes: OTP_CARTS_IMPORT_RAW_NOTES,
  },
  {
    label: "Load Dialed In Electric Example",
    getJson: getDialedInElectricImportExampleJson,
    rawNotes: DIALED_IN_ELECTRIC_IMPORT_RAW_NOTES,
  },
  {
    label: "Load Plate The Umpqua Example",
    getJson: getPlateTheUmpquaImportExampleJson,
    rawNotes: PLATE_THE_UMPQUA_IMPORT_RAW_NOTES,
  },
  {
    label: "Load La Cocina Example",
    getJson: getLaCocinaImportExampleJson,
    rawNotes: LA_COCINA_IMPORT_RAW_NOTES,
  },
  {
    label: "Load 2475 Townsgate Example",
    getJson: getTownsgate2475ImportExampleJson,
    rawNotes: TOWNSGATE_2475_IMPORT_RAW_NOTES,
  },
];
