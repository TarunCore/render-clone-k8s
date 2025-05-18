
import express, { Request, Response } from "express";
import { asyncHandler } from "../util/common";
import { createUser, loginUser } from "../services/authServices";
import { createDeployment } from "../services/deploymentServices";

const deploymentRouter = express.Router();

deploymentRouter.get("/", asyncHandler(async (req: Request, res: Response) => {
    res.send("Deployment API");
}));

deploymentRouter.post("/", asyncHandler(async (req: Request, res: Response) => {
    const data = await createDeployment(req.body);
    res.send({status: "success", message: "Deployment created successfully", data: data });
}));

export default deploymentRouter;