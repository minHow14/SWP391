// client/src/hooks/useDatabase.js
import { useContext } from 'react';
import { DatabaseContext } from '../context/databaseContext.js';

export const useDatabase = () => useContext(DatabaseContext);
