import express, { Request, Response } from "express";
import { asyncHandler } from "../util/common";
import { createUser, loginUser } from "../services/authServices";
import { client } from "../db/db";

const buildRouter = express.Router();

buildRouter.get("/:id", asyncHandler(async (req: Request, res: Response) => {
    
}));


export default buildRouter;