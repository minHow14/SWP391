import { createContext, useContext } from 'react';

export const DatabaseContext = createContext(null);
export const useDatabase = () => useContext(DatabaseContext);
