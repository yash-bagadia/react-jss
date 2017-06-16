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

const getStyles = (stylesOrSheet, theme) => {
  if (typeof stylesOrSheet !== 'function') {
    return stylesOrSheet;
  }
  return stylesOrSheet(theme)
}

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
  const isThemingEnabled = typeof stylesOrSheet === 'function'
  let contextTypes = { jssSheetsRegistry: instanceOf(SheetsRegistry) }
  if (isThemingEnabled) {
    contextTypes = Object.assign({}, contextTypes, themeListener.contextTypes)
  }

  const displayName = `Jss(${getDisplayName(InnerComponent)})`

  return class Jss extends Component {
    static displayName = displayName
    static InnerComponent = InnerComponent
    static contextTypes = contextTypes
    static defaultProps = InnerComponent.defaultProps

    constructor(props, context) {
      super(props, context)

      let theme;
      if (isThemingEnabled) {
        theme = themeListener.initial(context)
      }

      this.state = {
        ...this.createSheets(theme),
        theme
      }
    }

    createSheets = (theme) => {
      const staticSheet = jss.createStyleSheet(getStyles(stylesOrSheet, theme), options)
      const dynamicStyles = compose(staticSheet, getDynamicStyles(getStyles(stylesOrSheet, theme)))
      const dynamicSheet = jss.createStyleSheet(dynamicStyles, { link: true })
      return { staticSheet, dynamicSheet }
    }

    attachSheets = (state) => {
      state.staticSheet.attach()
      state.dynamicSheet.update(this.props).attach()
    }

    setTheme = theme => this.setState({theme})

    componentWillMount() {
      this.attachSheets(this.state)
    }

    componentDidMount() {
      this.unsubscribe = themeListener.subscribe(this.context, this.setTheme);
    }

    componentWillReceiveProps(nextProps) {
      if (this.state.dynamicSheet) {
        this.state.dynamicSheet.update(nextProps)
      }
    }

    componentWillUpdate(nextProps, nextState) {
      if (isThemingEnabled && nextState.theme && this.state.theme !== nextState.theme) {
        const newSheets = this.createSheets(nextState.theme)
        this.attachSheets(newSheets)
        this.setState(newSheets)
      }
    }

    componentDidUpdate(prevProps, prevState) {
      if (prevState.staticSheet !== this.state.staticSheet) {
        jss.removeStyleSheet(prevState.staticSheet)
      }
      if (prevState.dynamicSheet !== this.state.dynamicSheet) {
        jss.removeStyleSheet(prevState.dynamicSheet)
      }
    }

    render() {
      const sheet = this.state.dynamicSheet || this.state.staticSheet
      return <InnerComponent sheet={sheet} classes={sheet.classes} theme={theme} {...this.props} />
    }
  }
}
