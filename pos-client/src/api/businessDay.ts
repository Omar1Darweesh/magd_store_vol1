import apiClient from './client';

export interface BusinessDay {
    id: number;
    openedAt: string;
    closedAt: string | null;
    status: 'OPEN' | 'CLOSED';
    notes: string | null;
    opener: { id: number; fullName: string };
    closer: { id: number; fullName: string } | null;
}

export const businessDayApi = {
    getCurrent: (): Promise<BusinessDay | null> =>
        apiClient.get('/business-day/current'),

    open: (notes?: string): Promise<BusinessDay> =>
        apiClient.post('/business-day/open', { notes }),

    close: (notes?: string): Promise<BusinessDay> =>
        apiClient.post('/business-day/close', { notes }),
};
