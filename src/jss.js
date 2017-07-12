import {create} from 'jss'
import preset from 'jss-preset-default'

export {default as createGenerateClassNameDefault} from 'jss/lib/utils/createGenerateClassName'
export {default as SheetsManager} from 'jss/lib/SheetsManager'
export {SheetsRegistry, getDynamicStyles} from 'jss'
export default create(preset())
