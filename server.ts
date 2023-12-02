import { app } from "./app";
import connectDB from "./utils/db";

const PORT = process.env.PORT || 8000;
app.listen(process.env.PORT, async () => {
  console.log(`app started on port ${PORT}`)
  await connectDB();
})