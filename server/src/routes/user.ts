import express, { Request, Response } from "express";
import { asyncHandler } from "../util/common";
import { createUser, loginUser } from "../services/authServices";

const userRouter = express.Router();

userRouter.get("/:id", asyncHandler(async (req: Request, res: Response) => {
    throw new Error("This is a test error");
    res.send(`User ID:`);
}));

userRouter.post("/login", asyncHandler(async (req: Request, res: Response) => {
    const {username, password} = req.body;
    const data = await loginUser(username, password);
    // set cookie for token for 7 days
    res.cookie("token", data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({
        message: "User logged in successfully",
        data,
    });
}));

userRouter.post("/signup", asyncHandler(async (req: Request, res: Response) => {
    const data = await createUser(req.body);
    res.status(201).json({
        message: "User created successfully",
        data,
    });
}));





export default userRouter;