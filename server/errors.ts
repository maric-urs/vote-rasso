export class HttpError extends Error {
  statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'HttpError'
    this.statusCode = statusCode
  }
}

export class SivConfigError extends HttpError {
  constructor(message: string) {
    super(message, 503)
    this.name = 'SivConfigError'
  }
}

export class SivLookupError extends HttpError {
  constructor(message: string) {
    super(message, 502)
    this.name = 'SivLookupError'
  }
}
