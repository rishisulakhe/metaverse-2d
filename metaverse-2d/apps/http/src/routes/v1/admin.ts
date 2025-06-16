import { Router } from "express";

export const adminRouter=Router();

adminRouter.post('/element', (req, res) => {
    res.json({
        message: 'Create element endpoint'
    });
})

adminRouter.put('/element/:elementId', (req, res) => {
    res.json({
        message: `Update element with id  endpoint`
    });
})

adminRouter.post('/avatar', (req, res) => {
    res.json({
        message: 'Create avatar endpoint'
    });
})

adminRouter.post('/map',(req, res) => {
    res.json({
        message: 'Create map endpoint'
    });
})
