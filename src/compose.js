/**
 * Adds `composes` property to each top level rule
 * in order to have a composed class name for dynamic style sheets.
 *
 * It relies on jss-compose and jss-extend plugins.
 *
 * Example:
 * classes:  {left: 'a', button: 'b'}
 * styles:   {button: {height: () => { ... }}}
 * composed: {
 *   button: {
 *     composes: 'b',
 *     height: () => { ... }
 *   },
 *   left: {
 *     composes: 'a'
 *   }
 * }
 *
 * @param {Object} classes static classes map
 * @param {Object} styles dynamic styles object without static properties
 * @return {Object|null}
 */
export default (classes, styles) => {
  // Add `composes` property to rules which are already defined in `classes`.
  for (const name in styles) {
    const className = classes[name]
    if (!className) break

    if (typeof styles[name] === 'function') {
      styles[name] = {
        extend: styles[name],
        composes: className
      }
      continue
    }

    styles[name].composes = className
  }

  if (styles) {
    // Add rules which are defined in `classes` but aren't in styles.
    for (const name in classes) {
      const className = styles[name]
      if (!className) {
        styles[name] = {composes: classes[name]}
      }
    }
  }

  return styles
}
