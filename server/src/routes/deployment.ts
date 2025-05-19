
import express, { Request, Response } from "express";
import { asyncHandler } from "../util/common";
import { createUser, loginUser } from "../services/authServices";
import { createDeployment, getDeploymentById, getDeployments } from "../services/deploymentServices";

const router = express.Router();

router.get("/:id", asyncHandler(async (req: Request, res: Response) => {
    const {id} = req.params;
    const data = await getDeploymentById(id);
    res.send({status: "success", data: data });
}));

router.get("/", asyncHandler(async (req: Request, res: Response) => {
    const data = await getDeployments();
    res.send({status: "success", data: data });
}));

router.post("/", asyncHandler(async (req: Request, res: Response) => {
    const data = await createDeployment(req.body);
    res.send({status: "success", message: "Deployment created successfully", data: data });
}));

export default router;