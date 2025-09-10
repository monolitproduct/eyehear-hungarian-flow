import hu from './hu.json';

type TranslationKey = keyof typeof hu;
type TranslationVars = Record<string, string | number>;

/**
 * Translation function for Hungarian text
 * @param key - Translation key from hu.json
 * @param vars - Optional variables for string interpolation using {variable} syntax
 * @returns Translated string or the key if translation not found
 */
export function t(key: TranslationKey, vars?: TranslationVars): string {
  let translation = hu[key] || key;
  
  // Handle variable interpolation
  if (vars && typeof translation === 'string') {
    Object.entries(vars).forEach(([varKey, varValue]) => {
      const placeholder = `{${varKey}}`;
      translation = translation.replace(new RegExp(placeholder, 'g'), String(varValue));
    });
  }
  
  return translation;
}

export default { t };