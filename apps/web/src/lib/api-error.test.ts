import {
  extractFieldErrors,
  getErrorMessage,
  isForbiddenError,
  getForbiddenMessage,
} from "./api-error";

describe("extractFieldErrors", () => {
  it("returns field errors as Record<field, message>", () => {
    const error = {
      status: 400,
      success: false,
      errorCode: "VALIDATION_ERROR",
      message: "Validation failed",
      errors: [
        { field: "nik", constraint: "nik must be exactly 16 digits" },
        { field: "email", constraint: "email must be a valid email" },
      ],
    };

    const result = extractFieldErrors(error);
    expect(result).toEqual({
      nik: "nik must be exactly 16 digits",
      email: "email must be a valid email",
    });
  });

  it("returns null when errors array is empty", () => {
    const error = { status: 400, errors: [] };
    expect(extractFieldErrors(error)).toBeNull();
  });

  it("returns null when errors field is missing", () => {
    const error = { status: 400, message: "Bad Request" };
    expect(extractFieldErrors(error)).toBeNull();
  });

  it("returns null for null/undefined input", () => {
    expect(extractFieldErrors(null)).toBeNull();
    expect(extractFieldErrors(undefined)).toBeNull();
  });

  it("skips entries without field or constraint", () => {
    const error = {
      errors: [
        { field: "nik", constraint: "nik required" },
        { field: "", constraint: "missing field name" },
        { field: "email", constraint: "" },
      ],
    };

    const result = extractFieldErrors(error);
    expect(result).toEqual({ nik: "nik required" });
  });
});

describe("getErrorMessage", () => {
  it("returns joined constraints when field errors exist", () => {
    const error = {
      errors: [
        { field: "nik", constraint: "nik must be exactly 16 digits" },
        { field: "email", constraint: "email must be a valid email" },
      ],
      message: "Validation failed",
    };

    expect(getErrorMessage(error)).toBe(
      "nik must be exactly 16 digits. email must be a valid email"
    );
  });

  it("falls back to message field when no errors array", () => {
    const error = { status: 500, message: "Internal server error" };
    expect(getErrorMessage(error)).toBe("Internal server error");
  });

  it("returns generic fallback when nothing else available", () => {
    const error = { status: 500 };
    expect(getErrorMessage(error)).toBe("Terjadi kesalahan. Silakan coba lagi.");
  });

  it("accepts a custom fallback message", () => {
    expect(getErrorMessage({}, "Custom fallback")).toBe("Custom fallback");
  });

  it("uses field name when constraint is missing", () => {
    const error = {
      errors: [{ field: "nik", constraint: "" }],
      message: "Validation failed",
    };
    // constraint is falsy, so field is used as fallback in map
    expect(getErrorMessage(error)).toBe("nik");
  });
});

describe("isForbiddenError", () => {
  it("returns true for status 403", () => {
    const error = { status: 403, message: "Forbidden" };
    expect(isForbiddenError(error)).toBe(true);
  });

  it("returns false for other status codes", () => {
    expect(isForbiddenError({ status: 400 })).toBe(false);
    expect(isForbiddenError({ status: 401 })).toBe(false);
    expect(isForbiddenError({ status: 500 })).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isForbiddenError(null)).toBe(false);
    expect(isForbiddenError(undefined)).toBe(false);
  });
});

describe("getForbiddenMessage", () => {
  it("includes required permission when available", () => {
    const error = { status: 403, requiredPermission: "orders:create" };
    expect(getForbiddenMessage(error)).toBe("Akses ditolak. Izin diperlukan: orders:create");
  });

  it("returns generic forbidden message without permission details", () => {
    const error = { status: 403 };
    expect(getForbiddenMessage(error)).toBe(
      "Akses ditolak. Anda tidak memiliki izin untuk operasi ini."
    );
  });
});
