require("dotenv").config();

const environment = process.env.environment || "development";

const formatTitleCaseToKebabCase = (str: string) => {
  return str.toLowerCase().replace(/\s/g, "-");
};

const getPBABBucketName = (pbabToken: string) => {
  const envSuffix = {
    development: "-development",
    staging: "-staging",
    production: "-mainnet",
  };
  const base = formatTitleCaseToKebabCase(pbabToken);
  return `${base}${envSuffix[environment]}`;
};

const getBucketURL = (pbabBucketName: string) => {
  const prefix = "https://";
  const suffix = ".s3.amazonaws.com";
  return `${prefix}${pbabBucketName}${suffix}`;
};

export { getPBABBucketName, getBucketURL, formatTitleCaseToKebabCase };
