import express from 'express';
import User from '../Models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
const JWT_SECRET=process.env.JWT_TOKEN_SECRET;
export const registerUsrer=async(req,res,next)=>{
    try {
        const {name,email,password}=req.body;  
        const existingUser=await User.findOne({email});
        if(existingUser){
            return res.status(400).json({message:'User already exists'});
        }       
        const hashedPassword=await bcrypt.hash(password,10);
        const newUser=new User({
            name,
            email,
            password:hashedPassword
        });
        await newUser.save();
        const token=jwt.sign({userId:newUser._id},JWT_SECRET,{expiresIn:'1d'});
        res.status(201).json({message:'User registered successfully',token});
    } catch (error) {
        next(error);
    }
}
export const loginUser=async(req,res,next)=>{
    try {
        const {email,password}=req.body;
        // console.log("Login attempt:", { email });
        const user=await User.findOne({email});
        if(!user){
            return res.status(400).json({message:'Invalid email or password'});
        }   
        const isPasswordValid=await bcrypt.compare(password,user.password);
        if(!isPasswordValid){
            return res.status(400).json({message:'Invalid email or password'});
        }
        const token=jwt.sign({userId:user._id},JWT_SECRET,{expiresIn:'1d'});
        const {password:_,...userData}=user._doc;
        // console.log("userData:", userData);
        res.status(200).cookie("access_token",token,{httpOnly:true,secure:true,maxAge:24*60*60*1000}).json({message:'Login successful',token,userData});
    } catch (error) {
        next(error);
    }
}