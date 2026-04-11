import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectToDatabase from "./lib/db.js";
import sessionRouter from "./routes/session.js";
import adminRouter from "./routes/admin.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize MongoDB Connection (Optional for cold-starts)
connectToDatabase();

app.get("/", (req, res) => {
  res.send("Voltedged Game Backend API is running!");
});

// Mount modular routers
app.use("/api/session", sessionRouter);
app.use("/api/admin", adminRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Not Found",
    method: req.method,
    path: req.originalUrl,
  });
});

// Only listen locally if not on Vercel
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export the Express API for Vercel
export default app;