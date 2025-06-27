import z from 'zod';

export const SignupSchema = z.object({
  username: z.string(),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  type: z.enum(['user', 'admin']).default('user')
})

export const SigninSchema = z.object({
  username: z.string(),
  password: z.string().min(6, 'Password must be at least 6 characters long')
})  

export const UpdateMetadataSchema = z.object({
   avatarId: z.string()
})

export const CreateSpaceSchema = z.object({
    name: z.string(),
    dimensions: z.string().regex(/^[0-9]{1,4}x[0-9]{1,4}$/),
    mapId: z.string().optional(),
})

