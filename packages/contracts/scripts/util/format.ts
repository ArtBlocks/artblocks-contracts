const formatTitleCaseToKebabCase = (str: string, networkName: string) => {
  // also removes any duplicate network names (e.g. "goerli-goerli" -> "goerli")
  return str
    .toLowerCase()
    .replace(/\s/g, "-") // remove whitespace
    .replace(/\(/g, "") // remove (
    .replace(/\)/g, "") // remove )
    .replace(/\./g, "-") // replace "." w/ "-"
    .replace(/\_/g, "-") // replace "_" w/ "-"
    .replace(/-x-/g, "-") // replace "-x-" w/ "-" (partner contracts)
    .replace(`${networkName}-${networkName}`, `${networkName}`); // remove double network name
};

const getPBABBucketName = (pbabToken: string, networkName: string) => {
  const base = formatTitleCaseToKebabCase(pbabToken, networkName);
  return `${base}-${networkName}`;
};

const getBucketURL = (pbabBucketName: string) => {
  const prefix = "https://";
  const suffix = ".s3.amazonaws.com";
  return `${prefix}${pbabBucketName}${suffix}`;
};

export { getPBABBucketName, getBucketURL, formatTitleCaseToKebabCase };
