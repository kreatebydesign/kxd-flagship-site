export class ProposalBuilderError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ProposalBuilderError";
    this.status = status;
  }
}
