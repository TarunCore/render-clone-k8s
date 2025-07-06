import express, { Request, Response } from "express";
import { asyncHandler } from "../util/common";
import { hasProjectPermission } from "../services/authServices";
import { checkAndUpdatePodStatus, createProject, deleteProject, getProjectById, getProjects, updateProject } from "../services/projectServices";
import { client } from "../configs/db";
import { jwtMiddleware } from "../middleware/auth";

const router = express.Router();

router.get("/:id", jwtMiddleware, asyncHandler(async (req: Request, res: Response) => {
    const {id} = req.params;
    if(!await hasProjectPermission(id, req.user)) {
        res.status(403).send({ status: "error", message: "You do not have permission to access this project" });
        return;
    }
    const data = await getProjectById(id);
    res.send({status: "success", data: data });
}));

router.get("/", jwtMiddleware, asyncHandler(async (req: Request, res: Response) => {
    if(!req.user){
        res.status(401);
        return;
    }
    const data = await getProjects(req.user.id);
    res.send({status: "success", data: data });
}));

router.get("/:id/builds", jwtMiddleware, asyncHandler(async (req: Request, res: Response) => {
    if(!await hasProjectPermission(req.params.id, req.user)) {
        res.status(403).send({ status: "error", message: "You do not have permission to access this project" });
        return;
    }
    const responce = await client.query("SELECT * FROM builds WHERE project_id = $1 ORDER BY id DESC", [req.params.id]);
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
    if(!await hasProjectPermission(req.params.id, req.user)) {
        res.status(403).send({ status: "error", message: "You do not have permission to modify this project" });
        return;
    }
    const data = await updateProject(req.params.id, req.body);
    res.send({status: "success", message: "Project updated successfully", data: data });
}));

router.get("/status/:id", jwtMiddleware, asyncHandler(async (req: Request, res: Response) => {
    if(!await hasProjectPermission(req.params.id, req.user)) {
        res.status(403).send({ status: "error", message: "You do not have permission to access this project" });
        return;
    }
    const check = await checkAndUpdatePodStatus(req.params.id);
    // if (check.status === "error") {
    //     res.status(404).send(check);
    //     return;
    // }
    res.send(check);    
}));

router.delete("/:id", jwtMiddleware, asyncHandler(async (req: Request, res: Response) => {
    if(!await hasProjectPermission(req.params.id, req.user)) {
        res.status(403).send({ status: "error", message: "You do not have permission to delete this project" });
        return;
    }
    await deleteProject(req.params.id);
    res.send({status: "success", message: "Project deleted successfully" });
}));
export default router;