import { client } from "../configs/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import 'dotenv/config'
async function createUser(data: any) {
    const { email, username, password, provider } = data;
    const result = await client.query('INSERT INTO users(email, username, password, provider) VALUES ($1, $2, $3, $4) RETURNING id', [email, username, password, provider]);
    return result.rows;
}

//loginUser
async function loginUser(email: string, username: string, password: string) {
    const result = await client.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (result.rows.length === 0) {
        throw new Error('User not found');
    }
    const user = result.rows[0];
    if (user.password !== password) {
        throw new Error('Invalid password');
    }
    const token = jwt.sign({ id: user.id, username, email: user.email }, process.env.JWT_SECRET as string, {
        expiresIn: '2d',
    });
    return {
        token,
        user
    };
}

export { createUser, loginUser };