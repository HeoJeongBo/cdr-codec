/// <reference types="vite/client" />

declare module "*?worker" {
  const Constructor: new () => Worker;
  export default Constructor;
}
