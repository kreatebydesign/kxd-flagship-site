export type {
  ClientCommunicationDirection,
  ClientCommunicationDoc,
  ClientCommunicationPriority,
  ClientCommunicationStatus,
  ClientCommunicationType,
  CreateClientCommunicationInput,
  UpdateClientCommunicationInput,
  WorkspaceCommunicationRow,
  WorkspaceCommunicationsSnapshot,
} from "./types";

export { publishCommunicationActivity } from "./activity";

export {
  buildCommunicationsSnapshot,
  createClientCommunication,
  loadClientCommunications,
  updateClientCommunication,
} from "./data";
