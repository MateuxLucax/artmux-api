import { NextFunction, Request, Response } from "express"
import { decode, verify } from "jsonwebtoken"
import { JWT_SECRET } from "../utils/environmentUtil"

export default async function authMiddleware(request: Request, response: Response, next: NextFunction) {
  const authHeaders = request.headers.authorization

  if (!authHeaders) {
    return response.status(401).json({ message: "Token is missing" })
  }

  const [bearer, token] = authHeaders.split(" ")

  if (bearer != "Bearer") {
    return response.status(401).json({ message: "Malformed token" })
  }

  try {
    verify(token, JWT_SECRET)

    request.user = {
      id: Number(decode(token)?.sub?.toString())
    }

    next()
  } catch (err) {
    return response.status(401).json({ message: "Unauthorized" })
  }
}