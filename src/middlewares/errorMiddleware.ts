import { ErrorRequestHandler } from "express"

export const errorMidleware: ErrorRequestHandler = (err, req, res, next) => {
  console.trace(err)
  const code = 'statusCode' in err ? err.statusCode : 500
  const error = code == 500 ? 'Internal server error' : err?.message
  res.status(code)
  if (error) res.json({ error })
}