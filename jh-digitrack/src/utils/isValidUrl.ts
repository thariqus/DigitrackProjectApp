export const isValidUrl = (phrase: string) => {
  const sanitizedUrl = phrase.trim();
  const urlRegex =
    /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*(\?[a-zA-Z0-9=&]*)?$/;
  return urlRegex.test(sanitizedUrl);
};
