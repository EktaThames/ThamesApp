const jwt = require('jsonwebtoken');

/**
 * This middleware verifies the JWT token from the Authorization header.
 * If the token is valid, it attaches the decoded user payload to the request object.
 */
module.exports = function(req, res, next) {
  // Get token from header, expected format is "Bearer <token>"
  const authHeader = req.header('Authorization');

  // Check if token exists
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token or invalid format, authorization denied.' });
  }

  const token = authHeader.split(' ')[1];

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user; // Attach user from payload (e.g., { id, role })
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid.' });
  }
};