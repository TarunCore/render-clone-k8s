import { client } from "../configs/db";
import { JWT_SECRET } from "../middleware/auth";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { User } from "../types/userType";

async function createUser(data: any) {
    const { email, username, password, provider, avatar } = data;
    // OAuth -> random pass
    const passwordToHash = password || crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(passwordToHash, 10);
    const result = await client.query(
        'INSERT INTO users(email, username, password, provider, avatar) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, username, provider, avatar', 
        [email, username, hashedPassword, provider || 'custom', avatar]
    );
    return result.rows[0];
}

async function loginUser(email: string, username: string, password: string) {
    const result = await client.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (result.rows.length === 0) {
        return {
            success: false,
            message: 'User not found'
        }
    }
    const user = result.rows[0];
    
    if (user.provider && user.provider !== 'custom') {
        return {
            success: false,
            message: `Please login using ${user.provider}`
        }
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return {
            success: false,
            message: 'Invalid credentials'
        }
    }
    const token = jwt.sign({ id: user.id, username, email: user.email, avatar: user.avatar }, JWT_SECRET as string, {
        expiresIn: '3d',
    });
    return {
        success: true,
        token,
    };
}

async function LoginWithGithub(accessToken: string) {
    const [userData, emailData] = await Promise.all([
        fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
            },
        }).then(res => res.json()),
        fetch('https://api.github.com/user/emails', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github+json',
            },
        }).then(res => res.json())
    ]);
    const primaryEmail = emailData.find((email: any) => email.primary)?.email;
    if (!primaryEmail) {
        return {
            success: false,
            message: "No primary email found",
        };
    }
    const result = await client.query('SELECT * FROM users WHERE email = $1', [primaryEmail]);
    if (result.rows.length === 0) {
        const user = await createUser({
            email: primaryEmail,
            username: userData.login,
            avatar: userData.avatar_url,
            password: null,
            provider: 'github',
        });
        const token = jwt.sign({ id: user.id, username: user.username, email: user.email, avatar: userData.avatar_url }, JWT_SECRET as string, {
            expiresIn: '3d',
        });
        return {
            message: "User created successfully using Github",
            success: true,
            token
        };
    }
    const token = jwt.sign({ id: result.rows[0].id, username: result.rows[0].username, email: result.rows[0].email, avatar: result.rows[0].avatar }, JWT_SECRET as string, {
        expiresIn: '3d',
    });
    return {
        message: "User logged in successfully using Github",
        success: true,
        token,
    };
}

async function hasProjectPermission(projectId: string, User: User | null | undefined) {
    if (!User) {
        return false;
    }
    const userId = User.id;

    const result = await client.query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [projectId, userId]);
    return result.rows.length > 0;
}

export { createUser, loginUser, hasProjectPermission, LoginWithGithub };