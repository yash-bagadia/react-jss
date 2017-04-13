import hoistNonReactStatics from 'hoist-non-react-statics'
import jss from './jss'
import createHoc from './createHoc'

/**
 * Global index counter to preserve source order.
 * As we create the style sheet during componentWillMount lifecycle,
 * children are handled after the parents, so the order of style elements would
 * be parent->child. It is a problem though when a parent passes a className
 * which needs to override any childs styles. StyleSheet of the child has a higher
 * specificity, because of the source order.
 * So our solution is to render sheets them in the reverse order child->sheet, so
 * that parent has a higher specificity.
 *
 * @type {Number}
 */
let indexCounter = -100000

const Container = ({children}) => (children || null)

/**
 * Create a `injectSheet` function that will use the passed JSS instance.
 *
 * @param {Jss} jss
 * @return {Function}
 * @api public
 */
export default (localJss = jss) => (
  function injectSheet(stylesOrSheet, options = {}) {
    if (options.index === undefined) {
      options.index = indexCounter++
    }
    return (InnerComponent = Container) => {
      const Jss = createHoc(localJss, InnerComponent, stylesOrSheet, options)
      return hoistNonReactStatics(Jss, InnerComponent, {inner: true})
    }
  }
)
