import { Client } from 'pg'
 
export const client = new Client({
  user: 'root',
  password: 'password',
  host: 'localhost',
  port: 5433,
  database: 'render',
})