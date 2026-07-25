/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
import config from "@payload-config";
import "@payloadcms/next/css";
import type { ServerFunctionClient } from "payload";
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";
import React from "react";

// Ensure Vercel always renders this layout dynamically — never from static cache.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

import { importMap } from "./admin/importMap.js";
import "./custom.scss";
import { redirectRestrictedStaffFromPayloadAdmin } from "@/lib/staff/payload-admin-redirect";

type Args = {
  children: React.ReactNode;
};

const serverFunction: ServerFunctionClient = async function (args) {
  "use server";
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  });
};

/**
 * Redirect restricted staff before Payload RootLayout evaluates admin access UI.
 * Panel entry is allowed for authenticated users; data plane stays deny-by-default.
 */
const Layout = async ({ children }: Args) => {
  await redirectRestrictedStaffFromPayloadAdmin();

  return (
    <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
      {children}
    </RootLayout>
  );
};

export default Layout;
