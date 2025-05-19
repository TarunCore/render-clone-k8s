import express, { NextFunction, Request, Response } from "express"
import cors from "cors"
import 'dotenv/config'
import userRouter from "./routes/user";
import { client } from "./db/db";
import deploymentRouter from "./routes/deployment";

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



app.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
    console.log("Visit http://localhost:" + PORT);
});