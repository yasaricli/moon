import mongoose from "mongoose";

const monitorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    order: { type: Number, default: 0 },
    url: { type: String, required: true },
    method: { type: String, enum: ["GET", "POST"], default: "GET" },
    headers: [{ _id: false, key: String, value: String }],
    body: { type: String, default: "" },
    cert: { subject: String, issuer: String, issued: Date, expires: Date },
  },
  { timestamps: true },
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const checkSchema = new mongoose.Schema({
  monitor: { type: mongoose.Schema.Types.ObjectId, ref: "Monitor", required: true },
  at: { type: Date, required: true, expires: "30d" },
  ms: Number,
  status: Number,
  ok: Boolean,
  error: String,
  ip: String,
  phases: { redirect: Number, dns: Number, tcp: Number, tls: Number, server: Number },
});
checkSchema.index({ monitor: 1, at: -1 });

export const Monitor = mongoose.model("Monitor", monitorSchema);
export const Check = mongoose.model("Check", checkSchema);
export const Group = mongoose.model("Group", groupSchema);
