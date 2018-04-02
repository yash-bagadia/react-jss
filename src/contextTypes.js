import {object} from 'prop-types'
import * as symbols from './symbols'
import propTypes from './propTypes'

export default {
  [symbols.jss]: propTypes.jss,
  [symbols.sheetOptions]: object,
  [symbols.sheetsRegistry]: propTypes.registry,
  [symbols.managers]: object
}
