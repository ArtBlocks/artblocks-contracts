const formatTitleCaseToKebabCase = (str: string) => {
  return str.toLowerCase().replace(/\s/g, "-");
};

const getPBABBucketName = (pbabToken: string, networkName: string) => {
  const base = formatTitleCaseToKebabCase(pbabToken);
  return `${base}-${networkName}`;
};

const getBucketURL = (pbabBucketName: string) => {
  const prefix = "https://";
  const suffix = ".s3.amazonaws.com";
  return `${prefix}${pbabBucketName}${suffix}`;
};

export { getPBABBucketName, getBucketURL, formatTitleCaseToKebabCase };
