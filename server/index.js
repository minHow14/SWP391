<<<<<<< HEAD
import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
=======
// Entry point forwarder for backward compatibility
import './src/server.js';
>>>>>>> main
