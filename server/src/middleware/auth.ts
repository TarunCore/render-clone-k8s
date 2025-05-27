import jwt from "jsonwebtoken";

import { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
      }
    }
  }
}

export function jwtMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.token;
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    if(typeof decoded == 'string') {
        res.status(401).json({ message: "Unauthorized" });
        return
    }
    req.user = decoded as {
      id: string;
      username: string;
      email: string;
    };
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized" });
  }

}
