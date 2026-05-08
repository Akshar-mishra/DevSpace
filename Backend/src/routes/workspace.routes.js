import { Router } from "express";
import { createWorkspace ,getUserWorkspaces,getWorkspaceById } from "../controllers/workspace.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router= Router()

router.use(verifyJWT); //every route is proertcted

//dashboard route
router.route("/").post(createWorkspace).get(getUserWorkspaces)

// The Editor Route
router.route("/:workspaceId").get(getWorkspaceById)

export default router