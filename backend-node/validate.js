export function validateConfig(fileContent, config) {
  const errors = [];
  const totalLines = fileContent.toString().split('\n').length;
  const startLine  = Number(config.startLine);
  const endLine    = Number(config.endLine);

  if (!Number.isInteger(startLine) || startLine < 1)
    errors.push('startLine must be a positive integer');
  if (!Number.isInteger(endLine) || endLine < 1)
    errors.push('endLine must be a positive integer');
  if (errors.length === 0 && startLine > endLine)
    errors.push(`startLine (${startLine}) must be ≤ endLine (${endLine})`);
  if (errors.length === 0 && endLine > totalLines)
    errors.push(`endLine (${endLine}) exceeds file length (${totalLines} lines)`);
  if (!config.lineGroups || config.lineGroups.length === 0)
    errors.push('lineGroups must not be empty');

  return errors;
}
