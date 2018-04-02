const hasSymbol = typeof Symbol === 'function' && Symbol.for

/**
 * Namespaces to avoid conflicts on the context.
 */
export const jss = hasSymbol
  ? Symbol.for('jss')
  : '64a55d578f856d258dc345b094a2a2b3'
export const sheetsRegistry = hasSymbol
  ? Symbol.for('sheetsRegistry')
  : 'd4bd0baacbc52bbd48bbb9eb24344ecd'
export const managers = hasSymbol
  ? Symbol.for('managers')
  : 'b768b78919504fba9de2c03545c5cd3a'
export const sheetOptions = hasSymbol
  ? Symbol.for('sheetOptions')
  : '6fc570d6bd61383819d0f9e7407c452d'
