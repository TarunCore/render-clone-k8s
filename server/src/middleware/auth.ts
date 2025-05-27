import jwt from "jsonwebtoken";

import { NextFunction, Request, Response } from "express";
interface AuthenticatedRequest extends Request {
    userId?: string;
}

async function jwtAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    if(typeof decoded == 'string') {
        return res.status(401).json({ message: "Unauthorized" });
    }
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
    
}