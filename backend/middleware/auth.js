const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

if (!ADMIN_API_KEY) {
  console.warn('WARNING: ADMIN_API_KEY is not set in environment variables. All admin endpoints will be inaccessible.');
}

const verifyAdminApiKey = (req, res, next) => {
  if (!ADMIN_API_KEY) {
    return res.status(500).json({ error: 'Server authentication is not configured.' });
  }

  // Support both 'Authorization: Bearer KEY' and 'x-api-key: KEY'
  let apiKey = req.headers['x-api-key'];
  
  if (!apiKey && req.headers['authorization']) {
    const authHeader = req.headers['authorization'];
    if (authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    }
  }

  if (!apiKey || apiKey !== ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key.' });
  }

  next();
};

module.exports = {
  verifyAdminApiKey
};
