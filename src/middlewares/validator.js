/**
 * Reusable middleware for Joi schema validation.
 * @param {Object} schema - Joi validation schema object
 * @param {string} [property='body'] - The request property to validate ('body', 'query', 'params')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      errors: {
        wrap: {
          label: ''
        }
      }
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validasi input gagal.',
        errors: errorDetails
      });
    }

    req[property] = value;
    next();
  };
};

export default validate;
