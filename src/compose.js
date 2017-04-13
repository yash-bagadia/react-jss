/**
 * Adds `composes` property to each top level rule
 * in order to have a composed class name for dynamic style sheets.
 *
 * @param {StyleSheet} staticSheet
 * @param {Object} styles
 * @return {Object|null}
 */
export default (staticSheet, styles) => {
  for (const name in styles) {
    const className = staticSheet.classes[name]
    if (!className) break
    styles[name] = {...styles[name], composes: className}
  }

  if (styles) {
    for (const name in staticSheet.classes) {
      const className = styles[name]
      if (!className) {
        styles[name] = {composes: staticSheet.classes[name]}
      }
    }
  }

  return styles
}
