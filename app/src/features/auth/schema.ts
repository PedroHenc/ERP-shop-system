import { z } from 'zod'

const KEY = 'auth:validation.'

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: `${KEY}required` })
    .pipe(z.email({ error: `${KEY}invalidEmail` })),
  password: z.string().min(1, { error: `${KEY}required` }),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>

export const loginFormDefaults: LoginFormValues = { email: '', password: '' }
