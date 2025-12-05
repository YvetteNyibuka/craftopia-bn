/**
 * Generate slug from text
 */
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};

/**
 * Generate SKU code
 */
export const generateSKU = (name: string, category: string): string => {
  const nameCode = name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .substring(0, 3);

  const categoryCode = category
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .substring(0, 2);

  const timestamp = Date.now().toString().slice(-4);

  return `${nameCode}${categoryCode}-${timestamp}`;
};

/**
 * Pagination helper
 */
export const getPagination = (page: number, limit: number, total: number) => {
  const currentPage = Math.max(1, page);
  const itemsPerPage = Math.min(Math.max(1, limit), 100); // Max 100 items per page
  const totalPages = Math.ceil(total / itemsPerPage);
  const skip = (currentPage - 1) * itemsPerPage;

  return {
    page: currentPage,
    limit: itemsPerPage,
    total,
    pages: totalPages,
    skip,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
};

/**
 * Clean undefined values from object
 */
export const cleanObject = (obj: Record<string, any>): Record<string, any> => {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([_, value]) => value !== undefined && value !== null
    )
  );
};
