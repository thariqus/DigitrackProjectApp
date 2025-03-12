/**
 * Remove arrays from a type. One use case is to define a doctype without child
 * tables. This can be used in lists.
 */
export type WithoutArray<T> = {
  [K in keyof T]: T[K] extends Array<infer U> ? U : T[K];
};
