import { Router } from 'express';
import { userRouter } from './user';
import { adminRouter } from './admin';
import { spaceRouter } from './space';
import client from '@repo/db/client'
import { SigninSchema, SignupSchema } from '../../types';
import { compare, hash } from '../../scrypt';
import jwt from 'jsonwebtoken'
export const router= Router();
import { JWT_PASSWORD } from '../../config';
router.post('/signup',async (req,res)=>{
    console.log("inside signup")
    //we check the user
    const parsedData=SignupSchema.safeParse(req.body);
    if(!parsedData.success){
        console.log("parsed data incorrect");
        res.status(400).json({
            msg:"Validation failed"
        })
        return
    }

    const hashedPassword=await hash(parsedData.data.password);

    try{
        const user=await client.user.create({
            data:{
                username:parsedData.data.username,
                password:parsedData.data.password,
                role:parsedData.data.type === "admin" ? "Admin" : "User"
            }
        })
        res.json({
            userID:user.id
        })
    }
    catch(e){
        console.log("error in authentication");
        console.log(e);
        res.status(400).json({
            msg:"User already exists"
        })
    }
})

router.post('/signin',async (req,res)=>{
    const parsedData=SigninSchema.safeParse(req.body);
    if(!parsedData.success){
        res.status(403).json({
            msg:"Validation error"
        })
        return;
    }
    try{
        const user=await client.user.findUnique({
            where:{
                username:parsedData.data.username
            }
        })
        if(!user){
            res.status(403).json({
                msg:"User not found"
            })
            return
        }
        const isValid=await compare(parsedData.data.password,user.password);

        if(!isValid){
            res.status(403).json({msg:"User not found"})
            return
        }

        const token=jwt.sign({
            userId:user.id,
            role:user.role,
        },JWT_PASSWORD);

        res.json({
            token
        })
    
} catch(e){
    res.status(400).json({msg:"Internal server error"})
}
})

router.get('/elements',async (req,res)=>{
    const elements=await client.element.findMany();

    res.json({
        elements: elements.map(e=>({
            id:e.id,
            imageUrl:e.imageUrl,
            width:e.width,
            height:e.height,
            static:e.static
        }))
    })

})

router.get('/avatars', async (req,res)=>{
    const avatars=await client.avatar.findMany()
    res.json({
        avatars:avatars.map(x=>({
            id:x.id,
            imageUrl:x.imageUrl,
            name:x.name
        }))
    })
})

router.use('/user',userRouter);
router.use('/space',spaceRouter);
router.use('/admin',adminRouter);
