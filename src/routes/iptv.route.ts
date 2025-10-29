import express from "express";
import { iptv } from "../services/iptv.api";

export const iptvRouter = express.Router();

iptvRouter.use(express.text({ type: "*/*" }));
iptvRouter.use(express.urlencoded({ extended: true }));

iptvRouter.route("/folio").post(iptv.postFolio).get(iptv.getFolio);

iptvRouter.route("/syncroom").post(iptv.syncRoom);
