import React, {Component} from 'react'
import {instanceOf} from 'prop-types'
import {SheetsRegistry, getDynamicStyles} from 'jss'
import { themeListener } from '@iamstarkov/theming-w-listener'
import compose from './compose'
import getDisplayName from './getDisplayName'
import { murmur3 as createHash } from 'murmurhash-js'

const getStyles = (stylesOrSheet, theme) => {
  if (typeof stylesOrSheet !== 'function') {
    return stylesOrSheet;
  }
  return stylesOrSheet(theme)
}

const hashify = sheet => createHash(JSON.stringify(sheet.rules.raw))

/*
array of sheets: [ { sheet: StyleSheet, count: Number }, …]
add:
  * if its not already there, add it with count: 0,
  * if counter is 0, attach
  * inc count
remove:
  * if its not already there, throws
  * if its there, dec count
  * if counter is 0, detach
*/
class SharedStaticSheets {
  constructor() {
    this.sheets = []
  }
  clean() {
    // console.log('clean before', this.sheets);
    this.sheets = this.sheets.filter(item => item.count !== 0);
    // console.log('clean after', this.sheets);
  }
  add(sheet) {
    // debugger;
    // console.log('add before', this.sheets);
    let index = this.sheets.findIndex(item => item.hash === hashify(sheet))
    if (index === -1) {
      this.sheets = this.sheets.concat({ sheet, count: 0, hash: hashify(sheet) })
      index = this.sheets.length - 1
    }
    // console.log('add after', this.sheets);
    return this.sheets[index].sheet;
  }
  attach(sheet) {
    // debugger
    // console.log('attach before', this.sheets);
    let index = this.sheets.findIndex(item => item.hash === hashify(sheet))
    if (index === -1) {
      throw new Error('[sharedStaticSheets], you can attach non-added sheet: ' + sheet)
    }
    // * if counter is 0, attach
    if (this.sheets[index].count === 0) {
      this.sheets[index].sheet.attach()
    }
    // * inc count
    this.sheets[index].count = this.sheets[index].count + 1
    // console.log('attach after', this.sheets);
  }
  detach(sheet) {
    // debugger
    // console.log('detach before', this.sheets)
    let index = this.sheets.findIndex(item => item.hash === hashify(sheet))
    if (index === -1) {
      throw new Error('[sharedStaticSheets], you can detach non-added sheet: ' + sheet)
    }

    // * if its there, dec count
    this.sheets[index].count = this.sheets[index].count - 1

    // * if counter is 0, detach
    if (this.sheets[index].count === 0) {
      this.sheets[index].sheet.detach()
    }
    this.clean();
    // console.log('detach after', this.sheets)
  }
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
  const sharedStaticSheets = new SharedStaticSheets();
  // TODO: hot reload, current status of it, which version and how people use it
  // TODO: tests
  // TODO: if stylesOrSheet is sheet, or function returns a sheet:
  //  warning in dev, nothing in prod
  //  warning: we dont support theming for theming
  // TODO: Server-Side Rendering
  //  both dynamicSheet and staticSheet should be added in SheetsRegistry
  //  add tests for SSR's dynamicSheet
  // TODO: meta
  // TODO: add options for dynamicSheet and merge createHoc's options with { link: true };
  // TODO: ref counter
  // TODO: add reference to InnerComponent
  // TODO: tests:
  //  new theming
  //  fault-tolerant warning when stylesOrSheet is Sheet or its a function when
  //  rerender on theme updates with static and dynamic sheets
  //  it does work when functional styles uses different props
  //  in function styles: theme.color === (props => props.theme.color)()
  // TODO theming: deepEqual in componentWillReceiveProps for theme and warning
  // TODO two insctances of the same component with same functional styles but with different themes

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
      const sheet = jss.createStyleSheet(getStyles(stylesOrSheet, theme), options);
      const staticSheet = sharedStaticSheets.add(sheet)
      const dynamicStyles = compose(staticSheet, getDynamicStyles(getStyles(stylesOrSheet, theme)))
      let dynamicSheet;
      if (dynamicStyles) {
        dynamicSheet = jss.createStyleSheet(dynamicStyles, { link: true })
      }
      return { staticSheet, dynamicSheet }
    }

    attachSheets = (state) => {
      sharedStaticSheets.attach(state.staticSheet)
      if (this.context.jssSheetsRegistry) {
        this.context.jssSheetsRegistry.add(state.staticSheet)
      }
      if (state.dynamicSheet) {
        state.dynamicSheet.update(this.props).attach()
      }
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
      if (prevState.dynamicSheet !== this.state.dynamicSheet) {
        jss.removeStyleSheet(prevState.dynamicSheet)
      }
    }

    componentWillUnmount() {
      if (isThemingEnabled && this.unsubscribe) {
        this.unsubscribe()
      }
      sharedStaticSheets.detach(this.state.staticSheet);
      if (this.state.dynamicSheet) {
        this.state.dynamicSheet.detach()
      }
    }

    render() {
      const sheet = this.state.dynamicSheet || this.state.staticSheet
      const theme = this.state.theme;
      return <InnerComponent sheet={sheet} classes={sheet.classes} theme={theme} {...this.props} />
    }
  }
}
