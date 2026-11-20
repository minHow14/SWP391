// client/src/context/databaseContext.js
// Khởi tạo React Context chứa dữ liệu dùng chung (catalog, người dùng); giá trị do DatabaseProvider cung cấp.
import { createContext } from 'react';

export const DatabaseContext = createContext(null);
