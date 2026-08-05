export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function assertRequest(condition, status, message, details) {
  if (!condition) {
    throw new HttpError(status, message, details);
  }
}
