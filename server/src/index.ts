import express, { NextFunction, Request, Response } from "express"
import cors from "cors"
import 'dotenv/config'
import userRouter from "./routes/user";
import { client } from "./configs/db";
import deploymentRouter from "./routes/deployment";
import Websocket from "ws";
import buildRouter from "./routes/builds";
import { PassThrough } from 'stream'; 
import { stream } from "./configs/k8s";
import cookieParser from "cookie-parser";
import logger from "./logger";

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
app.use(cookieParser());
app.use("/api/v1/users", userRouter);
app.use("/api/v1/projects", deploymentRouter);
app.use("/api/v1/builds/", buildRouter)

app.get("/", (req, res) => {
  res.send("Hello World!");
});
(async()=>{
  await client.connect();
  console.log("Connected to PostgreSQL database");
})();
const frontendClients = new Map(); // Map<deploymentId, Set<clientWs>>

// wss.on('connection', (ws) => {
//   console.log('Client connected');
//   ws.on('message', (message) => {
//     console.log('Received:', message.toString());
//     const { type, deploymentId, logs } = JSON.parse(message.toString()); //TODO: toString()?
    
//     if (type === 'log') {
//       // Relay to frontend
//       const clients = frontendClients.get(deploymentId) || new Set();
//       //@ts-ignore
//       clients.forEach(client => client.send(logs));
//     }

//     if (type === 'frontend-subscribe') {
//       // Track frontends by deploymentId
//       if (!frontendClients.has(deploymentId)) frontendClients.set(deploymentId, new Set());
//       frontendClients.get(deploymentId).add(ws);
//     }
//   });
//   ws.send('Hello from WS logs server');
// });

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

    const { type, deploymentId } = parsed;

    if (type === 'frontend-subscribe' && deploymentId) {
      // If there's an existing logStream, end it before creating a new one
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
        ws.send(JSON.stringify({ error: 'Error streaming logs. Mostly container not created yet' }));
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