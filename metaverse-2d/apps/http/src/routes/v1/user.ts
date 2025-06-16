import { Router } from "express";

export const userRouter=Router();

userRouter.post('/metadata' , (req, res) => {
    res.json({
        message: 'Update user metadata endpoint'
    });
})

userRouter.get('/metadata/bulk', (req, res) => {
    res.json({
        message: 'Get user metadata endpoint'
    });
})