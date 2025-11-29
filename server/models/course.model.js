import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    id: {
      // e.g. "ENGR110"
      type: String,
      required: true,
      unique: true,
    },
    name: { type: String, required: true },
    professor: { type: String, required: true },
    location: { type: String, required: true },
    days: {
      type: [String], // ["Mon", "Wed"]
      default: [],
    },
    start: { type: String, required: true }, // keep as string for now
    end: { type: String, required: true },
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);
export default Course;
