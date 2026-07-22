class AppError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

class AuthError extends AppError {
  constructor(message = '인증이 필요합니다.') {
    super('UNAUTHORIZED', message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = '권한이 없습니다.') {
    super('FORBIDDEN', message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = '리소스를 찾을 수 없습니다.') {
    super('NOT_FOUND', message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = '이미 존재하는 리소스입니다.') {
    super('CONFLICT', message, 409);
  }
}

module.exports = { AppError, AuthError, ForbiddenError, NotFoundError, ConflictError };
