import { ApiResponse } from "../types";

/**
 * Standard API response formatter
 */
export const formatResponse = <T>(
  success: boolean,
  message: string,
  data?: T,
  pagination?: any
): ApiResponse<T> => {
  const response: ApiResponse<T> = {
    success,
    message,
  };

  if (data !== undefined) {
    response.data = data;
  }

  if (pagination) {
    response.pagination = pagination;
  }

  return response;
};

/**
 * Success response helper
 */
export const successResponse = <T>(
  message: string,
  data?: T,
  pagination?: any
): ApiResponse<T> => {
  return formatResponse(true, message, data, pagination);
};

/**
 * Error response helper
 */
export const errorResponse = (message: string, error?: string): ApiResponse => {
  return {
    success: false,
    message,
    error,
  };
};
