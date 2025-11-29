import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  {
    _id: false, // messages don't need their own ids
    timestamps: false,
  }
);

const conversationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    messages: [messageSchema],
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
