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

      let styles = stylesOrSheet
      let staticSheet = null
      if (!options.meta) options.meta = displayName

      const dynamicSheetOptions = {
        ...options,
        meta: `${options.meta}Dynamic`,
        link: true
      }

      if (stylesOrSheet && typeof stylesOrSheet.attach === 'function') {
        staticSheet = stylesOrSheet
        styles = null
      }

      let initialState = {
        styles: stylesOrSheet,
        staticSheet: null,
        dynamicSheet: null,
        options,
        dynamicStyles: null,
      }

      if (isThemingEnabled) {
        initialState = Object.assign({}, initialState, {
          theme: themeListener.initial(context)
        })
      }

      this.state = initialState;

      this.setTheme = theme => this.setState({theme}, () => {
        this.compileSheet()
      })
      
      this.compileSheet = () => {
        this.state.staticSheet = this.ref()
        if (this.state.dynamicSheet) this.state.dynamicSheet.attach()
        else if (this.state.dynamicStyles) {
          this.state.dynamicSheet = jss
            .createStyleSheet(this.state.dynamicStyles, dynamicSheetOptions)
            .update(this.props)
            .attach()
        }
        const {jssSheetsRegistry} = this.context
        if (jssSheetsRegistry) jssSheetsRegistry.add(this.state.staticSheet)
      }

      this.ref = () => {
        const compiledStyles = this.state.theme ? styles(this.state.theme) : styles;

        if (!this.state.staticSheet) {
          // todo
          this.state.staticSheet = jss.createStyleSheet(compiledStyles, this.state.options)
          this.state.dynamicStyles = compose(this.state.staticSheet, getDynamicStyles(compiledStyles))
        }
        if (this.state.staticSheet[refNs] === undefined) this.state.staticSheet[refNs] = 0
        if (refs(this.state.staticSheet) === 0) this.state.staticSheet.attach()
        inc(this.state.staticSheet)
        return this.state.staticSheet
      }

      this.deref = () => {
        if (dec(this.state.staticSheet) === 0) this.state.staticSheet.detach()
      }

    }

    componentWillMount() {
      if (isThemingEnabled) {
        const theme = themeListener.initial(this.context)
        this.setTheme(theme)
      } else {
        this.compileSheet()
      }
    }

    componentDidMount() {
      // here im getting theme updates
      this.unsubscribe = themeListener.subscribe(this.context, this.setTheme);
    }

    componentWillReceiveProps(nextProps) {
      if (this.state.dynamicSheet) {
        this.state.dynamicSheet.update(nextProps)
      }
    }

    componentWillUpdate(nextProps, nextState) {
      if (isThemingEnabled && nextState.theme && JSON.stringify(this.state.theme) !== JSON.stringify(nextState.theme)) {
        console.log('YOLO', nextState.theme)
      }
      if (process.env.NODE_ENV !== 'production') {
        // Support React Hot Loader.
        // if (this.state.staticSheet !== nextState.staticSheet) {
        //   this.state.staticSheet.detach()
        //   this.state.staticSheet = this.ref()
        // }
      }
    }

    componentWillUnmount() {
      // if (this.state.staticSheet && !staticSheet) {
        // this.state.staticSheet.detach()
        // const {jssSheetsRegistry} = this.context
        // if (jssSheetsRegistry) jssSheetsRegistry.remove(this.state.staticSheet)
      // } else {
        this.deref()
      // }
      if (this.state.dynamicSheet) this.state.dynamicSheet.detach()
    }

    render() {
      const sheet = this.state.dynamicSheet || this.state.staticSheet
      return <InnerComponent sheet={sheet} classes={sheet.classes} {...this.props} />
    }
  }
}
