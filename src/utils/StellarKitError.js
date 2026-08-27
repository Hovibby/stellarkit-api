class StellarKitError extends Error {
  constructor(message, statusCode, type, extras, suggestion) {
    super(message);
    this.name = "StellarKitError";
    this.statusCode = statusCode || 500;
    this.type = type || "ServerError";
    this.extras = extras || null;
    this.suggestion = suggestion || null;
  }

  toJSON() {
    const obj = { type: this.type, message: this.message };
    if (this.suggestion) obj.suggestion = this.suggestion;
    if (this.extras) obj.extras = this.extras;
    return obj;
  }
}

module.exports = StellarKitError;
