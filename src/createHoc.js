import React, {Component} from 'react'
import {instanceOf} from 'prop-types'
import {SheetsRegistry, getDynamicStyles} from 'jss'
import { themeListener } from 'theming'
import compose from './compose'
import getDisplayName from './getDisplayName'


const refNs = `ref-${String(Math.random()).substr(2)}`
const refs = sheet => sheet[refNs] || 0
const dec = sheet => --sheet[refNs]
const inc = sheet => ++sheet[refNs]

/**
 * Wrap a Component into a JSS Container Component.
 *
 * @param {Jss} jss
 * @param {Component} InnerComponent
 * @param {Object|StyleSheet} stylesOrSheet
 * @param {Object} [options]
 * @return {Component}
 */
export default (jss, InnerComponent, stylesOrSheet, options = {}) => {
  let styles = stylesOrSheet
  let staticSheet = null
  let dynamicStyles
  const isThemingEnabled = typeof stylesOrSheet === 'function'

  // Accept StyleSheet instance.
  if (stylesOrSheet && typeof stylesOrSheet.attach === 'function') {
    staticSheet = stylesOrSheet
    styles = null
  }

  const displayName = getDisplayName(InnerComponent)

  if (!options.meta) options.meta = displayName

  const dynamicSheetOptions = {
    ...options,
    meta: `${options.meta}Dynamic`,
    link: true
  }

  let contextTypes = { jssSheetsRegistry: instanceOf(SheetsRegistry) }
  if (isThemingEnabled) {
    contextTypes = Object.assign({}, contextTypes, themeListener.contextTypes)
  }

  function ref(theme) {
    const compiledStyles = theme ? styles(theme) : styles;
    if (!staticSheet) {
      staticSheet = jss.createStyleSheet(compiledStyles, options)
      dynamicStyles = compose(staticSheet, getDynamicStyles(compiledStyles))
    }
    if (staticSheet[refNs] === undefined) staticSheet[refNs] = 0
    if (refs(staticSheet) === 0) staticSheet.attach()
    inc(staticSheet)
    return staticSheet
  }

  function deref() {
    if (dec(staticSheet) === 0) staticSheet.detach()
  }

  return class Jss extends Component {
    static InnerComponent = InnerComponent

    static displayName = `Jss(${displayName})`
    static contextTypes = contextTypes;

    static defaultProps = InnerComponent.defaultProps
    constructor(props) {
      super(props)
      if (isThemingEnabled) {
        this.state = {theme: {}}
        this.setTheme = theme => this.setState({theme})
      }

      this.compileSheet = (theme) => {
        this.staticSheet = ref(theme)
        if (this.dynamicSheet) this.dynamicSheet.attach()
        else if (dynamicStyles) {
          this.dynamicSheet = jss
          .createStyleSheet(dynamicStyles, dynamicSheetOptions)
          .update(this.props)
          .attach()
        }
        const {jssSheetsRegistry} = this.context
        if (jssSheetsRegistry) jssSheetsRegistry.add(this.staticSheet)
      }
    }

    componentWillMount() {
      let theme;
      if (isThemingEnabled) {
        theme = themeListener.initial(this.context)
        this.setTheme(theme)
      }
      this.compileSheet(theme)
    }

    componentDidMount() {
      // here im getting theme updates
      this.unsubscribe = themeListener.subscribe(this.context, this.setTheme);
    }

    componentWillReceiveProps(nextProps) {
      if (this.dynamicSheet) {
        this.dynamicSheet.update(nextProps)
      }
    }

    componentWillUpdate(nextProps, nextState) {
      if (isThemingEnabled && nextState.theme && JSON.stringify(this.state.theme) !== JSON.stringify(nextState.theme)) {
        console.log(nextState.theme)
        // here i want to update static or dynamic sheets
        // this.staticSheet = ref(nextState.theme)
      }
      if (process.env.NODE_ENV !== 'production') {
        // Support React Hot Loader.
        if (this.staticSheet !== staticSheet) {
          this.staticSheet.detach()
          this.staticSheet = ref()
        }
      }
    }

    componentWillUnmount() {
      if (this.staticSheet && !staticSheet) {
        this.staticSheet.detach()
        const {jssSheetsRegistry} = this.context
        if (jssSheetsRegistry) jssSheetsRegistry.remove(this.staticSheet)
      }
      else deref()
      if (this.dynamicSheet) this.dynamicSheet.detach()
    }

    render() {
      const sheet = this.dynamicSheet || this.staticSheet
      console.log('render', InnerComponent.name, { isThemingEnabled })
      return <InnerComponent sheet={sheet} classes={sheet.classes} {...this.props} />
    }
  }
}
