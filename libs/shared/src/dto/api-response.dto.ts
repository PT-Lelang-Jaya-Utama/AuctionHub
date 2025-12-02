export class ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;

  constructor(partial: Partial<ApiResponse<T>>) {
    Object.assign(this, partial);
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T, message?: string): ApiResponse<T> {
    const response: Partial<ApiResponse<T>> = {
      success: true,
      message,
    };
    if (data !== null && data !== undefined) {
      response.data = data;
    }
    return new ApiResponse(response);
  }

  static error<T>(error: string, message?: string): ApiResponse<T> {
    return new ApiResponse({
      success: false,
      error,
      message,
    });
  }
}

export class PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  constructor(
    data: T[],
    page: number,
    limit: number,
    total: number,
  ) {
    super({ success: true, data });
    this.pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
