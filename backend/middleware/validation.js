import { AppError } from './error.js';

export const validateSchema = (schema) => {
  return (req, res, next) => {
    try {
      const { error } = schema.validate(req.body);
      if (error) {
        const message = error.details.map(detail => detail.message).join(', ');
        throw new AppError(message, 400, 'VALIDATION_ERROR');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Create validation schemas for different endpoints
import Joi from 'joi';

export const schemas = {
  login: Joi.object({
    username: Joi.string().min(3).max(20).required(),
    password: Joi.string().min(6).required()
  }),
  
  register: Joi.object({
    username: Joi.string().min(3).max(20).pattern(/^[a-zA-Z0-9_]+$/).required(),
    password: Joi.string().min(6).required()
  }),
  
  createQuiz: Joi.object({
    questions: Joi.array().min(1).items(
      Joi.object({
        question: Joi.string().min(5).required(),
        options: Joi.array().min(2).items(Joi.string().required()),
        correctAnswer: Joi.string().required()
      })
    ).required(),
    category: Joi.string().required(),
    difficulty: Joi.string().required()
  })
};