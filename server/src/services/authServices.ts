import { client } from "../db/db";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import 'dotenv/config'
async function createUser(data: any) {
    const result = await client.query('INSERT INTO users(email, username, password) VALUES ($1, $2, $3) RETURNING id', ['brianc', 'sdf', 'sda']);
    return result.rows;
}

//loginUser
async function loginUser(username: string, password: string) {
    const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
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