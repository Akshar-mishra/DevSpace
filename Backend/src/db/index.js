import mongoose,{Schema} from 'mongoose';

const connectDB = async () => {
    try{
        const connectionInstance= await mongoose.connect(`${process.env.MONGODB_URL}`)
        console.log(`MongoDb is connected !! DB host is : ${connectionInstance.connection.host}`);
        
    }
    catch(err){
        console.log("Error in Databse SEtup ",err);
        process.exit(1)
        
    }
}

export default connectDB