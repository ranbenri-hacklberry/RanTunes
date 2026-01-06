/**
 * Locale Utilities - Detect system language and direction
 */

// RTL languages
const RTL_LANGUAGES = ['he', 'ar', 'fa', 'ur', 'yi'];

/**
 * Detect if the browser/system language is RTL
 * @returns {boolean} true if RTL language
 */
export function isSystemRTL() {
    const lang = navigator.language || navigator.userLanguage || 'en';
    const langCode = lang.split('-')[0].toLowerCase();
    return RTL_LANGUAGES.includes(langCode);
}

/**
 * Get the appropriate direction based on system language
 * @returns {'rtl' | 'ltr'}
 */
export function getSystemDirection() {
    return isSystemRTL() ? 'rtl' : 'ltr';
}

/**
 * Get the system language code
 * @returns {string} e.g., 'he', 'en', 'ar'
 */
export function getSystemLanguage() {
    const lang = navigator.language || navigator.userLanguage || 'en';
    return lang.split('-')[0].toLowerCase();
}

export default {
    isSystemRTL,
    getSystemDirection,
    getSystemLanguage,
};
