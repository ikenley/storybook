export const createPrompt = (
  title: string,
  description: string,
  artNote: string,
  line: string,
  isCover: boolean,
): string => {
  if (isCover) {
    return `Create the cover for a book titled '${title}'. The book is about ${description}. Do not include text in the image. ${artNote}`;
  }
  return `Create an image based on the following line of a poem: '${line}'.\nDo not include text.\n${artNote}`;
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
