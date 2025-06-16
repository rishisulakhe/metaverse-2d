import { Router } from "express";

export const spaceRouter=Router();

spaceRouter.post('/', (req, res) => {
    res.json({
        message: 'Create space endpoint'
    });
});

spaceRouter.delete('/element', (req, res) => {
    res.json({
        message: 'Delete element endpoint'
    });
});


spaceRouter.delete('/:spaceId', (req, res) => {
    res.json({
        message: `Delete space with endpoint`
    });
});

spaceRouter.post('/element', (req, res) => {
    res.json({
        message: 'Create element endpoint'
    });
});

spaceRouter.get('/:spcaeId', (req, res) => {
    res.json({
        message: `Get space with endpoint`
    });
}
);