import { v2 as cloudinary } from 'cloudinary';

import { app } from "./app";
import connectDB from "./utils/db";

// cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY
});

const PORT = process.env.PORT || 8000;

// create server
app.listen(process.env.PORT, async () => {
  console.log(`app started on port ${PORT}`)
  await connectDB();
})

export { cloudinary }