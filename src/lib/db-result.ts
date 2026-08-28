type DatabaseError = {
  code?: string
  message: string
}

export function throwIfDbError(context: string, error: DatabaseError | null) {
  if (error) throw new Error(`${context}: ${error.message}`)
}

export function requireDbData<T>(context: string, result: { data: T; error: DatabaseError | null }): NonNullable<T> {
  throwIfDbError(context, result.error)
  if (result.data == null) throw new Error(`${context}: expected one row`)
  return result.data
}

export function isDatabaseConflict(error: DatabaseError | null, code: string) {
  return error?.code === code
}
