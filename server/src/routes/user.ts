import express, { Request, Response } from "express";
import { asyncHandler } from "../util/common";
import { createUser, loginUser, LoginWithGithub } from "../services/authServices";
import { client } from "../configs/db";
import { jwtMiddleware } from "../middleware/auth";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";


dotenv.config();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

const userRouter = express.Router();

userRouter.get("/me", jwtMiddleware, asyncHandler(async (req: Request, res: Response) => {
    res.send(req.user);
}));


userRouter.post("/login", asyncHandler(async (req: Request, res: Response) => {
    const {email, username, password, mode, code} = req.body;
    let data;
    if (mode === "github") {
        // Handle GitHub login
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code,
            }),
        });
    
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;
    
        if (accessToken) {
            data = await LoginWithGithub(accessToken);
            if(!data.success) {
                return res.status(400).json({
                    message: data.message,
                });
            }
        }else{
            return res.status(400).json({
                message: "No access token found",
            });
        }
    }else{
        data = await loginUser(email, username, password);
    }
    if(!data.success) {
        return res.status(400).json({
            message: data.message,
        });
    }
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

// Get a short-lived token for WebSocket authentication
userRouter.get("/ws-token", jwtMiddleware, asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    // Create a short-lived token (5 minutes) specifically for WebSocket auth
    const wsToken = jwt.sign(
        { id: req.user.id, username: req.user.username, email: req.user.email },
        process.env.JWT_SECRET as string,
        { expiresIn: '5m' }
    );
    res.status(200).json({ token: wsToken });
}));




export default userRouter;