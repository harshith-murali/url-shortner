/**
 * apiErrors.js
 *
 * Shared helpers for producing consistent API error responses.
 */

import { NextResponse } from 'next/server';

/**
 * Return a JSON error response.
 *
 * @param {string}  message  — human-readable error text
 * @param {number}  status   — HTTP status code
 * @param {Record<string,string>} [headers] — optional extra headers
 */
export function errorResponse(message, status, headers = {}) {
  return NextResponse.json({ error: message }, { status, headers });
}

export const Errors = {
  badRequest:      (msg)     => errorResponse(msg || 'Bad request.',          400),
  unauthorized:    ()        => errorResponse('Unauthorized.',                401),
  forbidden:       ()        => errorResponse('Forbidden.',                   403),
  notFound:        (msg)     => errorResponse(msg || 'Not found.',            404),
  conflict:        (msg)     => errorResponse(msg || 'Conflict.',             409),
  tooManyRequests: (headers) => errorResponse('Too many requests. Please slow down.', 429, headers),
  internal:        (msg)     => errorResponse(msg || 'Internal server error.', 500),
};

/**
 * Detect a MongoDB duplicate-key error (E11000).
 *
 * @param {unknown} err
 * @returns {boolean}
 */
export function isDuplicateKeyError(err) {
  return !!(
    err &&
    (err.code === 11000 ||
      (err.name === 'MongoServerError' && err.code === 11000))
  );
}
