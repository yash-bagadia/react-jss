import {object, instanceOf} from 'prop-types'
import jss, {SheetsRegistry, SheetsManager} from './jss'
import * as ns from './ns'

export default {
  [ns.jss]: instanceOf(jss.constructor),
  [ns.sheetOptions]: object,
  [ns.sheetsRegistry]: instanceOf(SheetsRegistry),
  [ns.sheetsManager]: instanceOf(SheetsManager)
}
