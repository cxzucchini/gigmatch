// Auto-formatters for money and phone inputs. Used with controlled
// TextInput components: onChangeText={(value) => setState(formatPriceInput(value))}

// Money input: digits only, grouped with thousands separators ("4500" -> "4,500").
// Capped at 7 digits to match the server's 1,000,000 peso limit.
const formatPriceInput = (value) => {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, 7);
  return digits ? Number(digits).toLocaleString('en-US') : '';
};

// Inverse of formatPriceInput: "4,500" -> 4500. Blank input -> 0.
const toPriceValue = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
};

// Philippine mobile numbers normalize to "+63 912 345 6789" while typing.
// Accepts 0912…, 912…, 63912… and +63912… entry. Other international
// numbers (+<country code>…) are preserved as typed.
const formatContactPhoneInput = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (raw.startsWith('+')) {
    const digits = raw.slice(1).replace(/\D/g, '');
    if (!digits) return '+';
    if (!digits.startsWith('63')) return `+${digits.slice(0, 15)}`;
    return groupPhNumber(digits.slice(2, 12));
  }

  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('63')) return groupPhNumber(digits.slice(2, 12));
  if (digits.startsWith('0')) return groupPhNumber(digits.slice(1, 11));
  return groupPhNumber(digits.slice(0, 10));
};

const groupPhNumber = (rest) => {
  if (!rest) return '+63 ';
  if (rest.length <= 3) return `+63 ${rest}`;
  if (rest.length <= 6) return `+63 ${rest.slice(0, 3)} ${rest.slice(3)}`;
  return `+63 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
};

module.exports = {
  formatPriceInput,
  toPriceValue,
  formatContactPhoneInput,
};
