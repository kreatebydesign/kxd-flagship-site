/** Frozen production staff-document-files rows for blob repair (Tyler). */
export const TARGET_FILE_IDS = [2, 3, 4] as const;
export type StaffPdfBlobRepairFileId = (typeof TARGET_FILE_IDS)[number];

export const STAFF_PDF_BLOB_REPAIR_MANIFEST: ReadonlyArray<{
  fileId: StaffPdfBlobRepairFileId;
  storageKey: string;
  contentHash: string;
}> = [
  {
    fileId: 2,
    storageKey: "2/policy-pdf-6688ad9bc90b67e1.pdf",
    contentHash:
      "6688ad9bc90b67e15669062b938f7f538a2cba0c0b346abf7755c64bac654123",
  },
  {
    fileId: 3,
    storageKey: "3/policy-pdf-dd7f53610cace80f.pdf",
    contentHash:
      "dd7f53610cace80fba5f735b3094cd0c9ade9fc778022ec2af65ccc083619d2a",
  },
  {
    fileId: 4,
    storageKey: "4/policy-pdf-7334b38b1c054472.pdf",
    contentHash:
      "7334b38b1c0544720708a5832ca1dacbbc486848fb6a64d9eb5cca1a91b3a7b3",
  },
];
