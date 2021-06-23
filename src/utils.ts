const removeExtension = (filePath: string): string => {
  const arr = filePath.split(".");
  arr.splice(arr.length - 1, 1);
  return arr.join(".");
};

export const utils = {removeExtension};
