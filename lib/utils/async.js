export class RequestTimeoutError extends Error {
  constructor(message = "A solicitação demorou mais que o esperado.") {
    super(message);
    this.name = "RequestTimeoutError";
  }
}

export function withTimeout(promise, timeoutMs, message) {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new RequestTimeoutError(message)),
      timeoutMs,
    );
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}
