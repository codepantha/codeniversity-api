import mongoose from 'mongoose';

const dbUrl:string = process.env.MONGO_URL || '';

const connectDB = async () => {
  try {
    await mongoose.connect(dbUrl).then((data:any) => {
      console.log(`Database connected with ${data.connection}`)
    })
  } catch (err:any) {
    console.log(err.message)
    setTimeout(connectDB, 5000)
  }
}

export default connectDB;
