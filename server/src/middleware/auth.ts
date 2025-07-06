import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { User } from "../types/userType";

export const JWT_SECRET = process.env.JWT_SECRET;

declare global {
  namespace Express {
    interface Request {
      user?: User
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
    const decoded = jwt.verify(token, JWT_SECRET as string);
    if(typeof decoded == 'string') {
        res.status(401).json({ message: "Unauthorized" });
        return
    }
    req.user = decoded as User;
    req.user.provider = 'custom';
    next();
  } catch (err) {
    res.status(401).json({ message: "Unauthorized" });
  }
}
