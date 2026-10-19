export const STAFF_MY_CLIENTS_PATH = "/admin/operations/staff/my-clients";

export function staffMyClientHref(clientId: number): string {
  return `${STAFF_MY_CLIENTS_PATH}/${clientId}`;
}
