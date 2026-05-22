import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health.routes";
import vapiRoutes from "./routes/vapi.routes";
import callsRoutes from "./routes/calls.routes";
import { requestIdMiddleware } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(requestIdMiddleware);
app.use(requestLogger);

app.use("/health", healthRoutes);
app.use("/vapi", vapiRoutes);
app.use("/api/calls", callsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
