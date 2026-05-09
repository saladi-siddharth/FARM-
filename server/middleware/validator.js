const Joi = require('joi');

// Validation schemas
const schemas = {
    signup: Joi.object({
        username: Joi.string().min(3).max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).max(100).required(),
        phone_number: Joi.string().min(10).max(15).allow('').optional()
    }),

    signin: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),

    forgotPassword: Joi.object({
        email: Joi.string().email().required()
    }),

    resetPassword: Joi.object({
        email: Joi.string().email().required(),
        otp: Joi.string().length(4).required(),
        newPassword: Joi.string().min(6).max(100).required()
    }),

    email: Joi.object({
        email: Joi.string().email().required()
    })
};

// Validation middleware factory
const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });

        if (error) {
            const errors = error.details.map(detail => detail.message);
            return res.status(400).json({
                error: 'Validation failed',
                details: errors
            });
        }

        req.body = value;
        next();
    };
};

module.exports = {
    validate,
    schemas
};
