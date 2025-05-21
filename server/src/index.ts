import express, { NextFunction, Request, Response } from "express"
import cors from "cors"
import 'dotenv/config'
import userRouter from "./routes/user";
import { client } from "./db/db";
import deploymentRouter from "./routes/deployment";
import Websocket from "ws";
const wss = new Websocket.Server({ port: 8080 });


const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong", error: err.message });
});

app.use("/api/v1/user", userRouter);
app.use("/api/v1/deployments", deploymentRouter);

app.get("/", (req, res) => {
  res.send("Hello World!");
});
(async()=>{
  await client.connect();
  console.log("Connected to PostgreSQL database");
})();
const frontendClients = new Map(); // Map<deploymentId, Set<clientWs>>

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('message', (message) => {
    console.log('Received:', message.toString());
    const { type, deploymentId, logs } = JSON.parse(message.toString()); //TODO: toString()?
    
    if (type === 'log') {
      // Relay to frontend
      const clients = frontendClients.get(deploymentId) || new Set();
      //@ts-ignore
      clients.forEach(client => client.send(logs));
    }

    if (type === 'frontend-subscribe') {
      // Track frontends by deploymentId
      if (!frontendClients.has(deploymentId)) frontendClients.set(deploymentId, new Set());
      frontendClients.get(deploymentId).add(ws);
    }
  });
  ws.send('Hello from server');
});

app.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
    console.log("Visit http://localhost:" + PORT);
});