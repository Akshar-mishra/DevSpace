import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/index.js";
import http from "http";
import { initializeSocket } from "./socket/index.js";

dotenv.config({
  path: "./.env"
});

connectDB()
  .then(() => {
    const httpServer = http.createServer(app);
    initializeSocket(httpServer);

    httpServer.listen(process.env.PORT || 8000, () => {
      console.log(`server is running on ${process.env.PORT || 8000}`);
    });
  })
  .catch((err) => {
    console.error("Connection error:", err);
  });

