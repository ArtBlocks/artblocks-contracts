export const formatTitleCaseToKebabCase = (str: string) => {
  return str.toLowerCase().replace(/\s/g, "-");
};
