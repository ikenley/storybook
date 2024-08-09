/** Gets an S3 date prefix in the form "YYYY-MM-DD" */
export const getS3DatePrefix = () => {
  const isoDate = new Date().toISOString();
  const parts = isoDate.split("T");
  return parts[0];
};
