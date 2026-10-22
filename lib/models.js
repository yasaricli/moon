import mongoose from "mongoose";

const monitorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    url: { type: String, required: true },
    method: { type: String, enum: ["GET", "POST"], default: "GET" },
    headers: [{ _id: false, key: String, value: String }],
    body: { type: String, default: "" },
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
});
checkSchema.index({ monitor: 1, at: -1 });

export const Monitor = mongoose.model("Monitor", monitorSchema);
export const Check = mongoose.model("Check", checkSchema);
