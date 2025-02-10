export enum Role {
    AI = 'AI',
    Human = 'Human'
}

export interface Message {
    role: Role;
    message: string;
} 