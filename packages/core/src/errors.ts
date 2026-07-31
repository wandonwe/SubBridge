/** Error raised when an input cannot be recognised or parsed. */
export class ParseError extends Error {
  override readonly name = 'ParseError'

  constructor(
    message: string,
    readonly input?: string,
  ) {
    super(message)
  }
}

/** Error raised when a node cannot be represented in a target format. */
export class ConvertError extends Error {
  override readonly name = 'ConvertError'
}
