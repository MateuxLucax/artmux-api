import { ErrorRequestHandler } from "express"

export const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
  console.trace(err)
  if (typeof err == 'string') {
    err = { errorMessage: err }
  }
  const code = 'statusCode' in err ? err.statusCode : 500
  const error = code == 500 ? 'Internal server error' : err.errorMessage
  res.status(code)
  if (error) res.json({ error })
  else res.end()
}