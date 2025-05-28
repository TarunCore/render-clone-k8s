import express, { Request, Response } from "express";
import { asyncHandler } from "../util/common";
import { createUser, hasProjectPermission, loginUser } from "../services/authServices";
import { createProject, getProjectById, getProjects, updateProject } from "../services/projectServices";
import { client } from "../configs/db";
import { DEP_MANAGER_BASE_URL } from "../config";
import { jwtMiddleware } from "../middleware/auth";

const router = express.Router();

router.get("/:id", jwtMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const {id} = req.params;
    if(!hasProjectPermission(id, req.user)) {
        res.status(403).send({ status: "error", message: "You do not have permission to create a project" });
        return;
    }
    const data = await getProjectById(id);
    res.send({status: "success", data: data });
}));

router.get("/", asyncHandler(async (req: Request, res: Response) => {
    const data = await getProjects();
    res.send({status: "success", data: data });
}));

router.get("/:id/builds", asyncHandler(async (req: Request, res: Response) => {
    if(!hasProjectPermission(req.params.id, req.user)) {
        res.status(403).send({ status: "error", message: "You do not have permission to create a project" });
        return;
    }
    const responce = await client.query("SELECT * FROM builds WHERE project_id = $1 ORDER BY id DESC", [req.params.id]);
    if (responce.rows.length === 0) {
        return res.status(404).send({ status: "error", message: "Build not found" });
    }
    res.send({ status: "success", data: responce.rows });
}));

router.post("/", jwtMiddleware, asyncHandler(async (req: Request, res: Response) => {
    if(!req.user){
        res.status(401);
        return;
    }
    const data = await createProject(req.body, req.user.id);
    res.send({status: "success", message: "Project created successfully", data: data });
}));

router.patch("/:id", jwtMiddleware, asyncHandler(async (req: Request, res: Response) => {
    if(!hasProjectPermission(req.params.id, req.user)) {
        res.status(403).send({ status: "error", message: "You do not have permission to create a project" });
        return;
    }
    const data = await updateProject(req.params.id, req.body);
    res.send({status: "success", message: "Project updated successfully", data: data });
}));
export default router;