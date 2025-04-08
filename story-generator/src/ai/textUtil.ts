export const createPrompt = (
  title: string,
  description: string,
  artNote: string,
  line: string,
  isCover: boolean
): string => {
  if (isCover) {
    return `Create the cover for a children's book titled '${title}'. The book is about ${description}. Do not include text in the image. ${artNote}`;
  }
  return `Create the art for a page of a children's book titled '${title}'. This page should be about: '${line}'. Do not include text in the image. ${artNote}`;
};

/** Create URL-safe filename based on the line */
export const getFileName = (line: string) => {
  const lineWithoutSpaces = line.replace(/\s/g, "-");
  const sanitizedLine = lineWithoutSpaces.replace(/[^a-zA-Z0-9\-]/g, "");
  return `${sanitizedLine}.png`;
};

/** Generates the baseUrl to be used as the static site URL prefix.
 * Example: (title: "The Great Adventure") => "/storybook/the-great-adventure"
 */
export const getBaseUrl = (title: string) => {
  const lineWithoutSpaces = title.replace(/\s/g, "-");
  const sanitizedLine = lineWithoutSpaces.replace(/[^a-zA-Z0-9\-]/g, "");
  const lowerCaseLine = sanitizedLine.toLowerCase();
  return `/storybook/${lowerCaseLine}`;
};
