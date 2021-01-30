// TODO remove if this is merged: https://github.com/drdreo/lit-scss-loader/pull/21
declare module '*.scss' {
  import { CSSResult } from 'lit-element';
  const css: CSSResult;
  export default css;
}
