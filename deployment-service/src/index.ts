import express from "express"
import cors from "cors"
import 'dotenv/config'
import buildRouter from "./routes/build";

const app = express();

const PORT = process.env.PORT || 3002;
export const socket = new WebSocket('ws://localhost:8080'); //TODO

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/v1/build", buildRouter);


app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(PORT, () => {
    console.log("Deployment Manager Service is running on port " + PORT);
    console.log("Visit http://localhost:" + PORT);
});