import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getCalls } from "../controllers/calls.controller";

const router = Router();

router.get("/", asyncHandler(getCalls));

export default router;
