// Errors raised by the generators. The `code` is stable and maps to a translated UI message.

export const ErrorCode = Object.freeze({
  INVALID_LENGTH: 'INVALID_LENGTH',
  NO_GROUPS: 'NO_GROUPS',
  TOO_SHORT_FOR_GROUPS: 'TOO_SHORT_FOR_GROUPS',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
})

export class GeneratorError extends Error {
  /**
   * @param {keyof typeof ErrorCode} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message)
    this.name = 'GeneratorError'
    this.code = code
  }
}
