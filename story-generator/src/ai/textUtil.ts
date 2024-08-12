export const createPrompt = (
  title: string,
  description: string,
  line: string,
  isCover: boolean
): string => {
  if (isCover) {
    return `Create the cover for a children's book titled '${title}'. The book is about ${description}.`;
  }
  return `Create the art for a page of a children's book titled '${title}'. The text for this page is: '${line}'.`;
};

/** Create URL-safe filename based on the line */
export const getFileName = (line: string) => {
  const lineWithoutSpaces = line.replace(/\s/g, "-");
  const sanitizedLine = lineWithoutSpaces.replace(/[^a-zA-Z0-9\-]/g, "");
  return `${sanitizedLine}.png`;
};
