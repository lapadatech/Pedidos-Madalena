export const maskCelular = (value) => {
  if (!value) return '';
  value = value.replace(/\D/g, '');
  if (value.length > 11) value = value.slice(0, 11);
  value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
  value = value.replace(/(\d)(\d{4})$/, '$1-$2');
  return value;
};

export const maskCep = (value) => {
  if (!value) return '';
  value = value.replace(/\D/g, '');
  if (value.length > 8) value = value.slice(0, 8);
  value = value.replace(/^(\d{5})(\d)/, '$1-$2');
  return value;
};
