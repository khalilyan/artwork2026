import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(request, _response, next) {
  next(new HttpError(404, `Route ${request.method} ${request.originalUrl} was not found.`));
}

export function errorHandler(error, _request, response, _next) {
  const status = error.status ?? 500;
  const payload = {
    error: {
      message: status === 500 ? 'Internal server error.' : error.message,
    },
  };

  if (error.details) {
    payload.error.details = error.details;
  }

  if (process.env.NODE_ENV !== 'production' && status === 500) {
    payload.error.debug = error.message;
  }

  response.status(status).json(payload);
}
