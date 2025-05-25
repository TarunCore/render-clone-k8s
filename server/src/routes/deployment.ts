
import express, { Request, Response } from "express";
import { asyncHandler } from "../util/common";
import { createUser, loginUser } from "../services/authServices";
import { createDeployment, getDeploymentById, getDeployments } from "../services/deploymentServices";
import { client } from "../configs/db";
import { DEP_MANAGER_BASE_URL } from "../config";

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

router.get("/:id/builds", asyncHandler(async (req: Request, res: Response) => {
    // order in descending order
    const responce = await client.query("SELECT * FROM builds WHERE base_deployment_id = $1 ORDER BY id DESC", [req.params.id]);
    if (responce.rows.length === 0) {
        return res.status(404).send({ status: "error", message: "Build not found" });
    }
    res.send({ status: "success", data: responce.rows });
}));

router.post("/", asyncHandler(async (req: Request, res: Response) => {
    const data = await createDeployment(req.body);
    res.send({status: "success", message: "Deployment created successfully", data: data });
}));

router.post("/:id/watch-logs/", asyncHandler(async (req: Request, res: Response) => {
    const buildId = await client.query(
        "SELECT last_build_id FROM deployments WHERE id = $1",
        [req.params.id]
      );
    if (buildId.rows.length === 0) {
        return res.status(404).send({ status: "error", message: "Build not found in deployments. Or no build yet" });
    }
    console.log("buildId", buildId.rows);
    const responce = await client.query("SELECT container_id FROM builds WHERE id = $1", [buildId.rows[0].last_build_id]);
    if (responce.rows.length === 0) {
        return res.status(404).send({ status: "error", message: "Build not found" });
    }
    const request_logs = await fetch(`${DEP_MANAGER_BASE_URL}/api/v1/build/watch-logs/${req.params.id}/${responce.rows[0].container_id}`, {
        method: "POST",
    });
    if (!request_logs.ok) {
        return res.status(500).send({ status: "error", message: "Error fetching logs" });
    }
    res.send({status: "success", message: "Watch request given to deployment-service" });
}));
export default router;