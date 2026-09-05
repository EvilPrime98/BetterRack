export const BR_BUTTON_VARIANTS = {
    primary: 'primary',
    secondary: 'secondary',
    ghost: 'ghost',
    classic: 'classic'
} as const; 

export type TBrButtonVariant = keyof typeof BR_BUTTON_VARIANTS;