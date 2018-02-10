/**
 * Adds `composes` property to each top level rule
 * in order to have a composed class name for dynamic style sheets.
 *
 * @param {Object} classes
 * @param {Object} styles
 * @return {Object|null}
 */
export default (classes, styles) => {
  for (const name in styles) {
    const className = classes[name]
    if (!className) break
    styles[name] = {...styles[name], composes: className}
  }

  if (styles) {
    for (const name in classes) {
      const className = styles[name]
      if (!className) {
        styles[name] = {composes: classes[name]}
      }
    }
  }

  return styles
}
