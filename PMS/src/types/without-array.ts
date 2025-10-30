export type WithoutArray<T> = {
  [K in keyof T]: T[K] extends Array<infer U> ? U : T[K];
};