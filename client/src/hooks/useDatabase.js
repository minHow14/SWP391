// client/src/hooks/useDatabase.js
// Hook tiện ích để đọc DatabaseContext.
import { useContext } from 'react';
import { DatabaseContext } from '../context/databaseContext.js';

// Trả về giá trị context gồm data, error, user, reload, refreshUser, userLoading, userError.
export const useDatabase = () => useContext(DatabaseContext);
