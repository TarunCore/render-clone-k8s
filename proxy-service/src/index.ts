import express from "express"
import cors from "cors"
import 'dotenv/config'
import httpProxy from "http-proxy"
const app = express();
const proxy = httpProxy.createProxyServer({});
const PORT = process.env.PORT || 3000;
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// TODO: Retrive from DB and add redis cache
const routingTable: { [key: string]: { target: string } } = {
  "todoapp.my-domain.com:8081": {
    target: "http://localhost:3001"
  }
};

app.use((req, res) => {
  const host = req.headers.host;
  if(!host) {
    res.status(400).send("Host header is missing");
    return;
  }
  const route = routingTable[host];
  if (route) {
    proxy.web(req, res, route);
  } else {
    res.status(404).send("App not found");
  }
});

app.listen(80);