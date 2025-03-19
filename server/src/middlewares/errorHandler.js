/**
 * Custom error handler middleware
 * Provides consistent error response format across the API
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Log error for server-side debugging
  console.error(`Error: ${err.message}`);
  console.error(`Stack: ${err.stack}`);
  
  // Send appropriate error response based on environment
  res.status(statusCode).json({
    success: false,
    message: err.message,
    // Only include stack trace in development
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    // Add any additional error details if available
    errors: err.errors || null
  });
};

/**
 * Not found error handler for invalid routes
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Async handler to remove try/catch blocks in route controllers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { errorHandler, notFound, asyncHandler }; 