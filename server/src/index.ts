import express, { NextFunction, Request, Response } from "express"
import cors from "cors"
import 'dotenv/config'
import userRouter from "./routes/user";
import { client } from "./configs/db";
import projectRouter from "./routes/project";
import Websocket from "ws";
import buildRouter from "./routes/builds";
import { PassThrough } from 'stream'; 
import { stream } from "./configs/k8s";
import cookieParser from "cookie-parser";
import logger from "./logger";
import jwt from "jsonwebtoken";
import { User } from "./types/userType";
import { hasProjectPermission } from "./services/authServices";
import { JWT_SECRET } from "./middleware/auth";

// TODO: Move to separate Logs Watch service 
const wss = new Websocket.Server({ port: 8080 });


const app = express();

const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong", error: err.message });
});
app.use(cookieParser());
app.use("/api/v1/users", userRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/builds/", buildRouter)

app.get("/", (req, res) => {
  res.send("Hello World!");
});
(async()=>{
  await client.connect();
  console.log("Connected to PostgreSQL database");
})();

wss.on('connection', (ws) => {
  logger.info('WS client connected');

  // Keep track of the logStream for this connection so we can close it on disconnect
  let logStream: PassThrough | null = null;

  ws.on('message', async(message) => {
    logger.info('Received: ' + message.toString());

    let parsed;
    try {
      parsed = JSON.parse(message.toString());
    } catch (err) {
      console.error('Invalid JSON:', err);
      ws.send(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    const { type, deploymentId, token } = parsed;

    if (type === 'frontend-subscribe' && deploymentId) {
      // Verify JWT token
      if (!token) {
        ws.send(JSON.stringify({ error: 'Authentication required' }));
        return;
      }

      let user: User;
      try {
        const decoded = jwt.verify(token, JWT_SECRET as string);
        if (typeof decoded === 'string') {
          ws.send(JSON.stringify({ error: 'Invalid token' }));
          return;
        }
        user = decoded as User;
      } catch (err) {
        ws.send(JSON.stringify({ error: 'Invalid or expired token' }));
        return;
      }

      const hasPermission = await hasProjectPermission(deploymentId, user);
      if (!hasPermission) {
        ws.send(JSON.stringify({ error: 'Access denied. You do not own this project.' }));
        return;
      }

      // End an existing logStream before creating a new one
      if (logStream) {
        logStream.end();
      }

      logStream = new PassThrough();

      logStream.on('data', (chunk) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(chunk.toString());
        }
      });
      try{
        await stream.log(
          'default',
          `pod-${deploymentId}`,
          deploymentId,
          logStream,
          {
            follow: true,
            tailLines: 100,
            pretty: false,
            timestamps: false,
          }
        );
      }catch(err){
        // console.error('Error streaming logs:', err);
        ws.send(JSON.stringify({ error: 'Error streaming logs. Build not started yet' }));
      }
    }
  });

  ws.on('close', () => {
    logger.info('WS client disconnected');
    if (logStream) {
      logStream.end();
    }
  });

  ws.send('Hello from WS logs server');
});


app.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
    console.log("Visit http://localhost:" + PORT);
});