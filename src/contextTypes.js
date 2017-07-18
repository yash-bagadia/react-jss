import {object, number, instanceOf} from 'prop-types'
import jss, {SheetsRegistry} from './jss'
import * as ns from './ns'

export default {
  [ns.jss]: instanceOf(jss.constructor),
  [ns.sheetOptions]: object,
  [ns.sheetsRegistry]: instanceOf(SheetsRegistry),
  [ns.providerId]: number
}
