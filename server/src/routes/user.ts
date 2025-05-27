import express, { Request, Response } from "express";
import { asyncHandler } from "../util/common";
import { createUser, loginUser } from "../services/authServices";
import { client } from "../configs/db";
import { jwtMiddleware } from "../middleware/auth";

const userRouter = express.Router();

userRouter.get("/me", jwtMiddleware, asyncHandler(async (req: Request, res: Response) => {
    res.send(req.user);
}));


userRouter.post("/login", asyncHandler(async (req: Request, res: Response) => {
    const {email, username, password} = req.body;
    const data = await loginUser(email, username, password);
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
    const {email, username, password, provider} = req.body;
    const userExists = await client.query("SELECT * FROM users WHERE email = $1 OR username = $2", [email, username]);
    if (userExists.rows.length > 0) {
        return res.status(400).json({
            message: "User already exists",
        });
    }
    const data = await createUser({email, username, password, provider});
    res.status(201).json({
        message: "User created successfully",
        data,
    });
}));

// logout
userRouter.post("/logout", asyncHandler(async (req: Request, res: Response) => {
    res.clearCookie("token");
    res.status(200).json({
        message: "User logged out successfully",
    });
}));




export default userRouter;