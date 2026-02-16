export type Result<T, E = string> = {
  ok: true
  val: T
} | {
  ok: false
  err: E
}

export function Ok<T>(val: T): Result<T, never> {
  return {
    ok: true,
    val,
  }
}

export function Err<E>(err: E): Result<never, E> {
  return {
    ok: false,
    err,
  }
}

export function rmap<T, U, E>(
  result: Result<T, E>,
  fn: (val: T) => U,
): Result<U, E> {
  if (result.ok) {
    return Ok(fn(result.val))
  } else {
    return result
  }
}

export function rThen<T, U, E, F>(
  result: Result<T, E>,
  fn: (val: T) => Result<U, F>,
): Result<U, E | F> {
  if (result.ok) {
    return fn(result.val)
  } else {
    return result
  }
}

export function rmatch<T, U, E>(
  result: Result<T, E>,
  onOk: (val: T) => U,
  onErr: (err: E) => U,
): U {
  if (result.ok) {
    return onOk(result.val)
  } else {
    return onErr(result.err)
  }
}

export function rPropogate<U, E>(error: Result<never, E>): Result<U, E> {
  return error
}