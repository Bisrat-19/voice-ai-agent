import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { handleCallEnded } from "../controllers/vapi.controller";

const router = Router();

router.post("/call-ended", asyncHandler(handleCallEnded));

export default router;
