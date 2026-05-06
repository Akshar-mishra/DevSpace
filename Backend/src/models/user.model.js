import mongoose,{Schema} from 'mongoose'
import jwt from "jsonwebtoken";
import bcrypt from 'bcryptjs'

const userSchema= new Schema(
    {
        name:{
            type: String,
            required:true,
            trim: true
        },
        email:{
            type: String,
            required:true,
            unique: true,
            lowercase: true
        },
        password:{
            type: String,
            required: [true, 'Password is required']
        },
        role:{
            type: String,
            enum: ["Interviewer", "Member"],
            default: "Member"
        },
        refreshToken: {
            type: String
        }
    
    },{timestamps:true}
)

//dont use ()=>{} bcs it dont allow (this.) and we need this in pre
//async lga hai to no need of next() 
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return ;

    this.password = await bcrypt.hash(this.password, 10);
    
});

//check password
userSchema.methods.isPasswordCorrect = async function(pass){
    return await bcrypt.compare(pass,this.password)
}

userSchema.methods.generateAccessToken =function (){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken =function (){
    return jwt.sign(
        {
            _id:this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


export const User = mongoose.model("User", userSchema)